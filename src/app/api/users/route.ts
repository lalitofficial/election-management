import bcrypt from "bcryptjs";
import { FamilyScope, GroupScopeType, UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hostelSubgroupType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

const nullableFamilyScopeSchema = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  return typeof value === "string" ? value.trim().toUpperCase() : value;
}, z.nativeEnum(FamilyScope).nullable());

const createUserSchema = z.object({
  loginId: z.string().trim().min(3),
  name: z.string().trim().min(2),
  password: z.string().trim().min(6),
  role: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.nativeEnum(UserRole),
  ),
  familyScope: nullableFamilyScopeSchema.optional(),
  managerId: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    return typeof value === "string" ? value.trim() : value;
  }, z.string().nullable().optional()),
  groupIds: z.preprocess((value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
    );
  }, z.array(z.string()).default([])),
});

function summarizeAssignments(
  groups: Array<{ scopeType: GroupScopeType; hostel: string; value: string }>,
) {
  const directHostels = new Set<string>();

  for (const group of groups) {
    if (group.scopeType === GroupScopeType.HOSTEL) {
      directHostels.add(group.hostel);
    }
  }

  return { directHostels };
}

function canManagerCoverGroups(
  managerGroups: Array<{ scopeType: GroupScopeType; hostel: string; value: string }>,
  selectedGroups: Array<{ scopeType: GroupScopeType; hostel: string; value: string }>,
) {
  const managerScope = summarizeAssignments(managerGroups);

  return selectedGroups.every((group) => {
    if (!managerScope.directHostels.has(group.hostel)) {
      return false;
    }

    return true;
  });
}

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer || (viewer.role !== UserRole.SUPERADMIN && viewer.role !== UserRole.ADMIN)) {
    return unauthorizedResponse("Not allowed.");
  }

  const where =
    viewer.role === UserRole.SUPERADMIN
      ? {}
      : {
          managerId: viewer.id,
        };

  const users = await prisma.user.findMany({
    where,
    include: {
      manager: true,
      groupAssignments: {
        include: { group: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
      familyScope: user.familyScope,
      manager: user.manager ? { id: user.manager.id, name: user.manager.name } : null,
      subgroupScope: user.groupAssignments.map((assignment) => assignment.group.label),
      assignedGroups: user.groupAssignments.map((assignment) => ({
        id: assignment.group.id,
        family: assignment.group.family,
        scopeType: assignment.group.scopeType,
        hostel: assignment.group.hostel,
        value: assignment.group.value,
        label: assignment.group.label,
      })),
      isActive: user.isActive,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer || (viewer.role !== UserRole.SUPERADMIN && viewer.role !== UserRole.ADMIN)) {
    return unauthorizedResponse("Not allowed.");
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "payload";
    return NextResponse.json(
      { error: `Invalid user payload: ${path} ${issue?.message ?? "is invalid"}.` },
      { status: 400 },
    );
  }

  if (viewer.role === UserRole.ADMIN && parsed.data.role !== UserRole.POC) {
    return NextResponse.json({ error: "Admins can only create POCs." }, { status: 403 });
  }

  if (
    parsed.data.role !== UserRole.SUPERADMIN &&
    parsed.data.familyScope !== FamilyScope.HOSTEL
  ) {
    return NextResponse.json({ error: "Only hostel scope is supported." }, { status: 400 });
  }

  const selectedGroups = parsed.data.groupIds.length
    ? await prisma.group.findMany({
        where: { id: { in: parsed.data.groupIds } },
      })
    : [];

  if (selectedGroups.length !== parsed.data.groupIds.length) {
    return NextResponse.json({ error: "One or more groups were not found." }, { status: 400 });
  }

  if (viewer.role === UserRole.ADMIN && parsed.data.familyScope !== viewer.familyScope) {
    return NextResponse.json({ error: "POCs must stay inside the Admin family." }, { status: 403 });
  }

  if (
    parsed.data.role !== UserRole.SUPERADMIN &&
    selectedGroups.some((group) => group.family !== FamilyScope.HOSTEL)
  ) {
    return NextResponse.json({ error: "Only hostel groups are supported." }, { status: 400 });
  }

  if (
    parsed.data.role === UserRole.ADMIN &&
    selectedGroups.some((group) => group.scopeType !== GroupScopeType.HOSTEL)
  ) {
    return NextResponse.json(
      { error: "Admins can only be assigned hostels." },
      { status: 400 },
    );
  }

  if (
    parsed.data.role === UserRole.POC &&
    selectedGroups.some((group) => group.scopeType === GroupScopeType.HOSTEL)
  ) {
    return NextResponse.json(
      { error: "POCs can only be assigned wings or departments." },
      { status: 400 },
    );
  }

  if (parsed.data.role === UserRole.POC) {
    const mismatch = selectedGroups.find((group) => {
      const configured = hostelSubgroupType[group.hostel];
      if (!configured) return false;
      const expected = configured === "WING" ? GroupScopeType.WING : GroupScopeType.DEPARTMENT;
      return group.scopeType !== expected;
    });
    if (mismatch) {
      const expected = hostelSubgroupType[mismatch.hostel];
      return NextResponse.json(
        { error: `${mismatch.hostel} POCs must be assigned by ${expected?.toLowerCase()}.` },
        { status: 400 },
      );
    }
  }

  if (
    parsed.data.role !== UserRole.SUPERADMIN &&
    selectedGroups.length === 0
  ) {
    return NextResponse.json(
      { error: "Assign at least one scope." },
      { status: 400 },
    );
  }

  if (viewer.role === UserRole.ADMIN) {
    const viewerGroups = viewer.groupAssignments.map((assignment) => assignment.group);

    if (!canManagerCoverGroups(viewerGroups, selectedGroups)) {
      return NextResponse.json(
        { error: "The selected scope is outside the Admin assignment." },
        { status: 403 },
      );
    }
  }

  if (parsed.data.role === UserRole.POC && parsed.data.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: parsed.data.managerId },
      include: {
        groupAssignments: {
          include: { group: true },
        },
      },
    });

    if (!manager || manager.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Manager must be an Admin." }, { status: 400 });
    }

    const managerGroups = manager.groupAssignments.map((assignment) => assignment.group);
    if (!canManagerCoverGroups(managerGroups, selectedGroups)) {
      return NextResponse.json(
        { error: "POC scope must stay within the selected Admin assignment." },
        { status: 400 },
      );
    }
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const createdUser = await prisma.user.create({
      data: {
        loginId: parsed.data.loginId,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        familyScope: parsed.data.role === UserRole.SUPERADMIN ? null : parsed.data.familyScope ?? null,
        managerId:
          parsed.data.role === UserRole.POC
            ? viewer.role === UserRole.ADMIN
              ? viewer.id
              : parsed.data.managerId ?? null
            : null,
        groupAssignments:
          parsed.data.role !== UserRole.SUPERADMIN
            ? {
                create: parsed.data.groupIds.map((groupId) => ({
                  groupId,
                })),
              }
            : undefined,
      },
      include: {
        manager: true,
        groupAssignments: {
          include: { group: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: createdUser.id,
        loginId: createdUser.loginId,
        name: createdUser.name,
        role: createdUser.role,
        familyScope: createdUser.familyScope,
        manager: createdUser.manager
          ? { id: createdUser.manager.id, name: createdUser.manager.name }
          : null,
        subgroupScope: createdUser.groupAssignments.map((assignment) => assignment.group.label),
        assignedGroups: createdUser.groupAssignments.map((assignment) => ({
          id: assignment.group.id,
          family: assignment.group.family,
          scopeType: assignment.group.scopeType,
          hostel: assignment.group.hostel,
          value: assignment.group.value,
          label: assignment.group.label,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
