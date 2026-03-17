import { FamilyScope, UserRole } from "@/generated/prisma/client";

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

export const requiredRosterColumns = [
  "roll_no",
  "name_of_the_student",
  "current_hostel",
  "room_no",
  "mobile_no",
] as const;

/**
 * Per-hostel POC sub-group type configuration.
 * Controls which scope type is used when assigning POCs within a hostel.
 * Hostels not listed here show both wings and departments.
 */
export const hostelSubgroupType: Record<string, "WING" | "DEPARTMENT"> = {
  Mandakini: "DEPARTMENT",
  Cauvery: "WING",
};

/**
 * Cauvery hostel wing definitions as [min, max] room-number ranges.
 * The wing value/label is the range string e.g. "101-112".
 */
export const cauveryWingRanges: Array<[number, number]> = [
  [101, 112],
  [113, 124],
  [125, 136],
  [137, 148],
  [149, 159],
  [161, 172],
  [201, 212],
  [213, 224],
  [225, 236],
  [237, 248],
  [249, 259],
  [261, 272],
  [301, 312],
  [313, 324],
  [325, 336],
  [337, 348],
  [349, 360],
  [361, 372],
  [1020, 1033],
  [1034, 1045],
  [1046, 1057],
  [2001, 2007],
  [2008, 2019],
  [2020, 2033],
  [2034, 2045],
  [2046, 2057],
  [3001, 3007],
  [3008, 3019],
  [3020, 3033],
  [3034, 3045],
  [3046, 3057],
];

