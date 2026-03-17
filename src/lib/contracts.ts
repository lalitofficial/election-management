export type UserRole = "SUPERADMIN" | "ADMIN" | "POC";
export type FamilyScope = "HOSTEL" | "DEPARTMENT" | "YEAR_BRANCH";
export type GroupScopeType = "HOSTEL" | "WING" | "DEPARTMENT";
export type TurnoutAction = "MARK" | "UNMARK";
export type PocTag = "LEAD" | "GREEN" | "ORANGE";

export type PocContact = {
  hostel: string;
  wing: string;
  name: string;
  rollNo: string;
  phoneNo: string;
  tags: PocTag[];
};

export type PocDirectoryRow = {
  hostel: string;
  wing: string;
  contacts: PocContact[];
};

export type UsersContextPayload = {
  users: ManagedUser[];
  availableGroups: GroupOption[];
};

export type DashboardPayload = {
  viewer: {
    id: string;
    name: string;
    loginId: string;
    role: UserRole;
    familyScope: FamilyScope | null;
    subgroupScope: string[];
    manager: { id: string; name: string } | null;
  };
  summary: {
    totalStudents: number;
    votedStudents: number;
    bulkVotes: number;
    totalVotes: number;
    turnoutPercentage: number;
    turnoutText: string;
  };
  familyBreakdowns: Partial<Record<FamilyScope, FamilyBreakdownRow[]>>;
  recentAudit: AuditItem[];
  recentImports: ImportItem[];
  users: ManagedUser[];
  availableGroups: GroupOption[];
  pocDirectory: PocDirectoryRow[];
};

export type FamilyBreakdownRow = {
  label: string;
  total: number;
  voted: number;
  turnout: number;
};

export type AuditItem = {
  id: string;
  action: TurnoutAction | null;
  description: string;
  reason: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
  };
  student: {
    id: string;
    rollNo: string;
    studentName: string;
    hostel: string;
    wing: string;
    department: string;
    year: string;
    roomNo: string;
    phoneNo: string;
  } | null;
};

export type ImportItem = {
  id: string;
  filename: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
};

export type ManagedUser = {
  id: string;
  loginId: string;
  name: string;
  role: UserRole;
  familyScope: FamilyScope | null;
  isActive: boolean;
  manager: { id: string; name: string } | null;
  subgroupScope: string[];
  assignedGroups: GroupOption[];
};

export type GroupOption = {
  id: string;
  family: FamilyScope;
  scopeType: GroupScopeType;
  hostel: string;
  value: string;
  label: string;
};

export type HostelStudent = {
  id: string;
  rollNo: string;
  studentName: string;
  hostel: string;
  wing: string;
  roomNo: string;
  department: string;
  year: string;
  phoneNo: string;
  hasVoted: boolean;
  pocs: PocContact[];
};

export type SearchStudent = {
  id: string;
  rollNo: string;
  studentName: string;
  hostel: string;
  wing: string;
  department: string;
  year: string;
  roomNo: string;
  phoneNo: string;
  hasVoted: boolean;
  votedAt: string | null;
  votedBy: { id: string; name: string; loginId: string } | null;
  pocs: PocContact[];
  recentAudit: Array<{
    id: string;
    action: TurnoutAction | null;
    description: string;
    reason: string | null;
    createdAt: string;
    actor: string;
  }>;
};
