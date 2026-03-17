import "dotenv/config";
import bcrypt from "bcryptjs";

import {
  FamilyScope,
  GroupScopeType,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const hostelGroups = ["Alakananda", "Cauvery", "Ganga", "Godavari", "Jamuna", "Mandakini"];

const cauveryWingRanges: Array<[number, number]> = [
  [101, 112], [113, 124], [125, 136], [137, 148], [149, 159], [161, 172],
  [201, 212], [213, 224], [225, 236], [237, 248], [249, 259], [261, 272],
  [301, 312], [313, 324], [325, 336], [337, 348], [349, 360], [361, 372],
  [1020, 1033], [1034, 1045], [1046, 1057],
  [2001, 2007], [2008, 2019], [2020, 2033], [2034, 2045], [2046, 2057],
  [3001, 3007], [3008, 3019], [3020, 3033], [3034, 3045], [3046, 3057],
];

async function upsertGroup(family: FamilyScope, value: string) {
  return prisma.group.upsert({
    where: {
      family_scopeType_hostel_value: {
        family,
        scopeType: GroupScopeType.HOSTEL,
        hostel: value,
        value,
      },
    },
    create: {
      family,
      scopeType: GroupScopeType.HOSTEL,
      hostel: value,
      value,
      label: value,
    },
    update: {
      label: value,
    },
  });
}

async function upsertWingGroup(hostel: string, rangeMin: number, rangeMax: number) {
  const value = `${rangeMin}-${rangeMax}`;
  return prisma.group.upsert({
    where: {
      family_scopeType_hostel_value: {
        family: FamilyScope.HOSTEL,
        scopeType: GroupScopeType.WING,
        hostel,
        value,
      },
    },
    create: {
      family: FamilyScope.HOSTEL,
      scopeType: GroupScopeType.WING,
      hostel,
      value,
      label: `Rooms ${value}`,
    },
    update: {
      label: `Rooms ${value}`,
    },
  });
}

async function main() {
  const [superAdminPassword, adminPassword, pocPassword] = await Promise.all([
    bcrypt.hash("superadmin123", 10),
    bcrypt.hash("admin123", 10),
    bcrypt.hash("poc123", 10),
  ]);

  await prisma.pOCGroupAssignment.deleteMany({});
  await prisma.bulkVoteEntry.deleteMany({});
  await prisma.auditEvent.deleteMany({});
  await prisma.importJob.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      loginId: {
        in: ["department-admin", "year-admin", "cse-poc", "year2-poc"],
      },
    },
  });

  await prisma.user.upsert({
    where: { loginId: "superadmin" },
    update: {
      name: "Chief Election Officer",
      passwordHash: superAdminPassword,
      role: UserRole.SUPERADMIN,
      familyScope: null,
      managerId: null,
      isActive: true,
    },
    create: {
      loginId: "superadmin",
      name: "Chief Election Officer",
      passwordHash: superAdminPassword,
      role: UserRole.SUPERADMIN,
    },
  });

  const hostelAdmin = await prisma.user.upsert({
    where: { loginId: "hostel-admin" },
    update: {
      name: "Hostel Turnout Admin",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      familyScope: FamilyScope.HOSTEL,
      managerId: null,
      isActive: true,
    },
    create: {
      loginId: "hostel-admin",
      name: "Hostel Turnout Admin",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      familyScope: FamilyScope.HOSTEL,
    },
  });

  for (const hostel of hostelGroups) {
    await upsertGroup(FamilyScope.HOSTEL, hostel);
  }

  for (const [min, max] of cauveryWingRanges) {
    await upsertWingGroup("Cauvery", min, max);
  }

  const ganga = await prisma.group.findUniqueOrThrow({
    where: {
      family_scopeType_hostel_value: {
        family: FamilyScope.HOSTEL,
        scopeType: GroupScopeType.HOSTEL,
        hostel: "Ganga",
        value: "Ganga",
      },
    },
  });
  await prisma.pOCGroupAssignment.deleteMany({ where: { userId: hostelAdmin.id } });
  await prisma.pOCGroupAssignment.createMany({
    data: [ganga.id].map((groupId) => ({
      userId: hostelAdmin.id,
      groupId,
    })),
  });

  const poc = await prisma.user.upsert({
    where: { loginId: "ganga-poc" },
    update: {
      name: "Ganga POC",
      passwordHash: pocPassword,
      role: UserRole.POC,
      familyScope: FamilyScope.HOSTEL,
      managerId: hostelAdmin.id,
      isActive: true,
    },
    create: {
      loginId: "ganga-poc",
      name: "Ganga POC",
      passwordHash: pocPassword,
      role: UserRole.POC,
      familyScope: FamilyScope.HOSTEL,
      managerId: hostelAdmin.id,
    },
  });

  await prisma.pOCGroupAssignment.deleteMany({ where: { userId: poc.id } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
