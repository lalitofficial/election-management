import { FamilyScope, UserRole } from "@/lib/contracts";

export const familyLabels: Record<FamilyScope, string> = {
  HOSTEL: "Hostels",
  DEPARTMENT: "Departments",
  YEAR_BRANCH: "Year / Branch",
};

export const familyShortLabels: Record<FamilyScope, string> = {
  HOSTEL: "Hostel",
  DEPARTMENT: "Department",
  YEAR_BRANCH: "Year / Branch",
};

export const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "SuperAdmin",
  ADMIN: "Admin",
  POC: "POC",
};

