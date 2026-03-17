import { FamilyScope, GroupScopeType, Prisma, UserRole } from "@/generated/prisma/client";

export type ScopeAssignment = {
  scopeType: GroupScopeType;
  hostel: string;
  value: string;
  label: string;
};

export type ScopeUser = {
  id: string;
  role: UserRole;
  familyScope: FamilyScope | null;
  assignments: ScopeAssignment[];
};

export type ScopeStudent = {
  hostel: string;
  wing: string;
  department: string;
};

type HosteledScope = {
  fullHostels: Set<string>;
  wingMap: Map<string, Set<string>>;
  departmentMap: Map<string, Set<string>>;
};

function buildHostelScope(assignments: ScopeAssignment[]): HosteledScope {
  const directHostels = new Set<string>();
  const wingMap = new Map<string, Set<string>>();
  const departmentMap = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    if (assignment.scopeType === GroupScopeType.HOSTEL) {
      directHostels.add(assignment.hostel);
      continue;
    }

    if (assignment.scopeType === GroupScopeType.WING) {
      const wings = wingMap.get(assignment.hostel) ?? new Set<string>();
      wings.add(assignment.value);
      wingMap.set(assignment.hostel, wings);
      continue;
    }

    if (assignment.scopeType === GroupScopeType.DEPARTMENT) {
      const departments = departmentMap.get(assignment.hostel) ?? new Set<string>();
      departments.add(assignment.value);
      departmentMap.set(assignment.hostel, departments);
    }
  }

  const fullHostels = new Set(
    [...directHostels].filter(
      (hostel) => !wingMap.has(hostel) && !departmentMap.has(hostel),
    ),
  );

  return { fullHostels, wingMap, departmentMap };
}

export function getAssignedHostels(assignments: ScopeAssignment[]) {
  const { fullHostels, wingMap, departmentMap } = buildHostelScope(assignments);
  return new Set([...fullHostels, ...wingMap.keys(), ...departmentMap.keys()]);
}

export function canAccessStudent(user: ScopeUser, student: ScopeStudent) {
  if (user.role === UserRole.SUPERADMIN) {
    return true;
  }

  if (user.familyScope !== FamilyScope.HOSTEL) {
    return false;
  }

  const { fullHostels, wingMap, departmentMap } = buildHostelScope(user.assignments);

  if (fullHostels.has(student.hostel)) {
    return true;
  }

  if (wingMap.get(student.hostel)?.has(student.wing)) {
    return true;
  }

  return departmentMap.get(student.hostel)?.has(student.department) ?? false;
}

export function buildScopeFilters(user: ScopeUser): Prisma.StudentWhereInput {
  if (user.role === UserRole.SUPERADMIN) {
    return {};
  }

  if (user.familyScope !== FamilyScope.HOSTEL) {
    return { id: "__never__" };
  }

  const { fullHostels, wingMap, departmentMap } = buildHostelScope(user.assignments);
  const branches: Prisma.StudentWhereInput[] = [];

  if (fullHostels.size > 0) {
    branches.push({
      hostel: { in: [...fullHostels] },
    });
  }

  for (const [hostel, wings] of wingMap.entries()) {
    branches.push({
      hostel,
      wing: { in: [...wings] },
    });
  }

  for (const [hostel, departments] of departmentMap.entries()) {
    branches.push({
      hostel,
      department: { in: [...departments] },
    });
  }

  if (branches.length === 0) {
    return { id: "__never__" };
  }

  return branches.length === 1 ? branches[0] : { OR: branches };
}
