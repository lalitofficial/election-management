import { AuditEventType, FamilyScope, GroupScopeType, Prisma, TurnoutAction, UserRole } from "@/generated/prisma/client";
import { buildPocLookup, getPocDirectory } from "@/lib/poc-directory";
import { buildScopeFilters, canAccessStudent, getAssignedHostels, type ScopeUser } from "@/lib/permissions";
import { formatDepartmentLabel, formatPercentage, formatWingLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export type ViewerRecord = Prisma.UserGetPayload<{
  include: {
    groupAssignments: {
      include: {
        group: true;
      };
    };
    pocs: {
      include: {
        groupAssignments: {
          include: {
            group: true;
          };
        };
      };
    };
    manager: true;
  };
}>;

type SearchParams = {
  q?: string;
  hostel?: string;
  roomNo?: string;
};

function getScopedUser(viewer: ViewerRecord): ScopeUser {
  return {
    id: viewer.id,
    role: viewer.role,
    familyScope: viewer.familyScope,
    assignments: viewer.groupAssignments.map((assignment) => ({
      scopeType: assignment.group.scopeType,
      hostel: assignment.group.hostel,
      value: assignment.group.value,
      label: assignment.group.label,
    })),
  };
}

function getGroupLabel(scopeType: GroupScopeType, hostel: string, value: string) {
  return scopeType === GroupScopeType.HOSTEL
    ? hostel
    : scopeType === GroupScopeType.WING
      ? `${hostel} · ${formatWingLabel(value)}`
      : `${hostel} · ${formatDepartmentLabel(value)}`;
}

function getFamilyField(family: FamilyScope) {
  return family === FamilyScope.HOSTEL ? ("hostel" as const) : null;
}

async function getBreakdown(
  family: FamilyScope,
  scopeWhere: Prisma.StudentWhereInput,
) {
  const field = getFamilyField(family);

  if (!field) {
    return [];
  }

  const [totals, voted] = await Promise.all([
    prisma.student.groupBy({
      by: [field],
      where: scopeWhere,
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: [field],
      where: {
        ...scopeWhere,
        hasVoted: true,
      },
      _count: { _all: true },
    }),
  ]);

  const votedMap = new Map<string, number>(
    voted.map((row) => [String(row[field]), row._count._all]),
  );

  return totals
    .map((row) => {
      const label = String(row[field]);
      const total = row._count._all;
      const votedCount = votedMap.get(label) ?? 0;
      const turnout = total === 0 ? 0 : (votedCount / total) * 100;

      return {
        label,
        total,
        voted: votedCount,
        turnout,
      };
    })
    .sort((left, right) => right.turnout - left.turnout || left.label.localeCompare(right.label));
}

function getAuditWhere(viewer: ScopeUser): Prisma.AuditEventWhereInput {
  if (viewer.role === UserRole.SUPERADMIN) {
    return {};
  }

  return {
    student: {
      is: buildScopeFilters(viewer),
    },
  };
}

export async function getDashboardPayload(viewer: ViewerRecord) {
  const scopedUser = getScopedUser(viewer);
  const scopeWhere = buildScopeFilters(scopedUser);
  const [totalStudents, votedStudents, bulkVoteAggregate, recentAudit, recentImports, fullPocDirectory] = await Promise.all([
    prisma.student.count({ where: scopeWhere }),
    prisma.student.count({
      where: {
        ...scopeWhere,
        hasVoted: true,
      },
    }),
    viewer.role === UserRole.SUPERADMIN
      ? prisma.bulkVoteEntry.aggregate({
          _sum: { count: true },
        })
      : Promise.resolve({ _sum: { count: 0 } }),
    prisma.auditEvent.findMany({
      where: {
        ...getAuditWhere(scopedUser),
        type:
          viewer.role === UserRole.SUPERADMIN
            ? {
                in: [AuditEventType.TURNOUT, AuditEventType.BULK_VOTE],
              }
            : AuditEventType.TURNOUT,
      },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        actor: true,
        student: true,
      },
    }),
    prisma.importJob.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    getPocDirectory(),
  ]);

  const visibleFamilies = [FamilyScope.HOSTEL];

  const familyBreakdowns = Object.fromEntries(
    await Promise.all(
      visibleFamilies.map(async (family) => [
        family,
        await getBreakdown(family, scopeWhere),
      ]),
    ),
  );

  const bulkVotes = bulkVoteAggregate._sum.count ?? 0;
  const totalVotes = votedStudents + bulkVotes;
  const turnoutPercentage = totalStudents === 0 ? 0 : (totalVotes / totalStudents) * 100;

  // Derive visible POC wings from user assignments — no DB query needed.
  const pocDirectory = (() => {
    if (viewer.role === UserRole.SUPERADMIN) return fullPocDirectory;
    const hostelSet = new Set(
      scopedUser.assignments
        .filter((a) => a.scopeType === GroupScopeType.HOSTEL)
        .map((a) => a.hostel),
    );
    const wingSet = new Set(
      scopedUser.assignments
        .filter((a) => a.scopeType === GroupScopeType.WING)
        .map((a) => `${a.hostel}|${a.value}`),
    );
    return fullPocDirectory.filter(
      (row) => hostelSet.has(row.hostel) || wingSet.has(`${row.hostel}|${row.wing}`),
    );
  })();

  return {
    viewer: {
      id: viewer.id,
      name: viewer.name,
      loginId: viewer.loginId,
      role: viewer.role,
      familyScope: viewer.familyScope,
      subgroupScope: scopedUser.assignments.map((assignment) => assignment.label),
      manager: viewer.manager
        ? {
            id: viewer.manager.id,
            name: viewer.manager.name,
          }
        : null,
    },
    summary: {
      totalStudents,
      votedStudents,
      bulkVotes,
      totalVotes,
      turnoutPercentage,
      turnoutText: formatPercentage(turnoutPercentage),
    },
    familyBreakdowns,
    recentAudit: recentAudit.map((event) => ({
      id: event.id,
      action: event.action,
      description: event.description,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
      actor: {
        id: event.actor.id,
        name: event.actor.name,
        role: event.actor.role,
      },
      student: event.student
        ? {
            id: event.student.id,
            rollNo: event.student.rollNo,
            studentName: event.student.studentName,
            hostel: event.student.hostel,
            wing: event.student.wing,
            department: event.student.department,
            year: event.student.year,
            roomNo: event.student.roomNo,
            phoneNo: event.student.phoneNo,
          }
        : null,
    })),
    recentImports: recentImports.map((job) => ({
      id: job.id,
      filename: job.filename,
      status: job.status,
      createdCount: job.createdCount,
      updatedCount: job.updatedCount,
      failedCount: job.failedCount,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
    })),
    pocDirectory,
    users: [],
    availableGroups: [],
  };
}

export async function getUsersContext(viewer: ViewerRecord) {
  const scopedUser = getScopedUser(viewer);

  const [users, availableGroups] = await Promise.all([
    viewer.role === UserRole.SUPERADMIN
      ? prisma.user.findMany({
          orderBy: [{ role: "asc" }, { name: "asc" }],
          include: {
            manager: true,
            groupAssignments: { include: { group: true } },
          },
        })
      : viewer.role === UserRole.ADMIN
        ? prisma.user.findMany({
            where: { managerId: viewer.id },
            orderBy: { name: "asc" },
            include: {
              manager: true,
              groupAssignments: { include: { group: true } },
            },
          })
        : Promise.resolve([]),
    viewer.role === UserRole.SUPERADMIN
      ? prisma.group.findMany({
          where: { family: FamilyScope.HOSTEL },
          orderBy: [{ scopeType: "asc" }, { hostel: "asc" }, { value: "asc" }],
        })
      : viewer.familyScope === FamilyScope.HOSTEL
        ? prisma.group.findMany({
            where: {
              family: FamilyScope.HOSTEL,
              hostel: { in: [...getAssignedHostels(scopedUser.assignments)] },
            },
            orderBy: [{ scopeType: "asc" }, { hostel: "asc" }, { value: "asc" }],
          })
        : Promise.resolve([]),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
      familyScope: user.familyScope,
      isActive: user.isActive,
      manager: user.manager ? { id: user.manager.id, name: user.manager.name } : null,
      subgroupScope: user.groupAssignments.map((a) => a.group.label),
      assignedGroups: user.groupAssignments.map((a) => ({
        id: a.group.id,
        family: a.group.family,
        scopeType: a.group.scopeType,
        hostel: a.group.hostel,
        value: a.group.value,
        label: a.group.label ?? getGroupLabel(a.group.scopeType, a.group.hostel, a.group.value),
      })),
    })),
    availableGroups: availableGroups.map((group) => ({
      id: group.id,
      family: group.family,
      scopeType: group.scopeType,
      hostel: group.hostel,
      value: group.value,
      label: group.label,
    })),
  };
}

export async function getFamilyBreakdown(
  viewer: ViewerRecord,
  family: FamilyScope,
) {
  if (family !== FamilyScope.HOSTEL) {
    return null;
  }

  if (viewer.role !== UserRole.SUPERADMIN && viewer.familyScope !== family) {
    return null;
  }

  return getBreakdown(family, buildScopeFilters(getScopedUser(viewer)));
}

export async function searchStudents(
  viewer: ViewerRecord,
  params: SearchParams,
) {
  const q = params.q?.trim();
  const scopeWhere = buildScopeFilters(getScopedUser(viewer));

  const where: Prisma.StudentWhereInput = {
    ...scopeWhere,
    ...(params.hostel ? { hostel: params.hostel } : {}),
    ...(params.roomNo ? { roomNo: params.roomNo } : {}),
    ...(q
      ? {
          OR: [
            { rollNo: { contains: q, mode: "insensitive" } },
            { studentName: { contains: q, mode: "insensitive" } },
            { hostel: { contains: q, mode: "insensitive" } },
            { roomNo: { contains: q, mode: "insensitive" } },
            { phoneNo: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [students, pocDirectory] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        votedBy: true,
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            actor: true,
          },
        },
      },
      take: 24,
      orderBy: [{ hasVoted: "asc" }, { rollNo: "asc" }],
    }),
    getPocDirectory(),
  ]);
  const pocLookup = buildPocLookup(pocDirectory);

  return students
    .map((student) => ({
      id: student.id,
      rollNo: student.rollNo,
      studentName: student.studentName,
      hostel: student.hostel,
      wing: student.wing,
      department: student.department,
      year: student.year,
      roomNo: student.roomNo,
      phoneNo: student.phoneNo,
      hasVoted: student.hasVoted,
      votedAt: student.votedAt?.toISOString() ?? null,
      votedBy: student.votedBy
        ? {
            id: student.votedBy.id,
            name: student.votedBy.name,
            loginId: student.votedBy.loginId,
          }
        : null,
      pocs: pocLookup.get(`${student.hostel}|${student.wing}`) ?? [],
      recentAudit: student.auditEvents.map((event) => ({
        id: event.id,
        action: event.action,
        description: event.description,
        reason: event.reason,
        createdAt: event.createdAt.toISOString(),
        actor: event.actor.name,
      })),
    }))
    .sort((left, right) => {
      if (!q) {
        return left.rollNo.localeCompare(right.rollNo);
      }

      const leftExact = left.rollNo.toLowerCase() === q.toLowerCase() ? -1 : 0;
      const rightExact = right.rollNo.toLowerCase() === q.toLowerCase() ? -1 : 0;

      if (leftExact !== rightExact) {
        return leftExact - rightExact;
      }

      return left.rollNo.localeCompare(right.rollNo);
    });
}

export async function getHostelStudents(
  viewer: ViewerRecord,
  hostel: string,
) {
  const scopedUser = getScopedUser(viewer);
  const scopeWhere = buildScopeFilters(scopedUser);

  const [students, pocDirectory] = await Promise.all([
    prisma.student.findMany({
      where: { ...scopeWhere, hostel },
      orderBy: [{ hasVoted: "asc" }, { roomNo: "asc" }, { rollNo: "asc" }],
    }),
    getPocDirectory(),
  ]);
  const pocLookup = buildPocLookup(pocDirectory);

  return students.map((student) => ({
    id: student.id,
    rollNo: student.rollNo,
    studentName: student.studentName,
    hostel: student.hostel,
    wing: student.wing,
    roomNo: student.roomNo,
    department: student.department,
    year: student.year,
    phoneNo: student.phoneNo,
    hasVoted: student.hasVoted,
    pocs: pocLookup.get(`${student.hostel}|${student.wing}`) ?? [],
  }));
}

export async function updateTurnout(
  viewer: ViewerRecord,
  studentId: string,
  action: TurnoutAction,
  reason?: string,
) {
  const scopedUser = getScopedUser(viewer);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  if (!canAccessStudent(scopedUser, student)) {
    throw new Error("You do not have access to that student.");
  }

  if (action === TurnoutAction.MARK && student.hasVoted) {
    return student;
  }

  if (action === TurnoutAction.UNMARK && !student.hasVoted) {
    return student;
  }

  return prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data:
        action === TurnoutAction.MARK
          ? {
              hasVoted: true,
              votedAt: new Date(),
              votedById: viewer.id,
            }
          : {
              hasVoted: false,
              votedAt: null,
              votedById: null,
            },
    });

    await tx.auditEvent.create({
      data: {
        actorId: viewer.id,
        studentId: student.id,
        type: AuditEventType.TURNOUT,
        action,
        description:
          action === TurnoutAction.MARK
            ? `${student.studentName} was marked as voted.`
            : `${student.studentName} was unmarked.`,
        reason: action === TurnoutAction.UNMARK ? reason?.trim() || null : null,
        payload: {
          rollNo: student.rollNo,
          hostel: student.hostel,
          wing: student.wing,
          department: student.department,
          year: student.year,
          roomNo: student.roomNo,
          phoneNo: student.phoneNo,
        },
      },
    });

    return updatedStudent;
  });
}
