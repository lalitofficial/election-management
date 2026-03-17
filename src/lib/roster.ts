import * as XLSX from "xlsx";
import { AuditEventType, FamilyScope, GroupScopeType, ImportStatus } from "@/generated/prisma/client";
import { requiredRosterColumns } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  deriveWingFromRoom,
  deriveYearFromRoll,
  formatDepartmentLabel,
  formatWingLabel,
  normalizeDepartmentCode,
  normalizeHeader,
} from "@/lib/utils";

type ParsedStudent = {
  rollNo: string;
  studentName: string;
  hostel: string;
  wing: string;
  roomNo: string;
  phoneNo: string;
  department: string;
  year: string;
  branch: string;
  yearBranch: string;
};

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
}

export function parseRosterBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error("The spreadsheet does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheet];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("The spreadsheet is empty.");
  }

  const parsedRows = rawRows.map((row) => normalizeRow(row));
  const availableColumns = Object.keys(parsedRows[0]);
  const missingColumns = requiredRosterColumns.filter((column) => !availableColumns.includes(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  const seenRollNos = new Set<string>();

  return parsedRows.flatMap((row, index) => {
    const rollNo = String(row.roll_no).trim();
    const studentName = String(row.name_of_the_student).trim();
    const hostel = String(row.current_hostel).trim();
    const roomNo = String(row.room_no).trim() || "Unknown";
    const phoneNo = String(row.mobile_no).trim() || "Not available";
    const wing = deriveWingFromRoom(roomNo, hostel);
    const department = normalizeDepartmentCode(String(row.dept ?? row.department ?? "").trim());
    const year = deriveYearFromRoll(rollNo);

    // Ignore non-student rows such as hostel summary/alumni entries.
    if (!/\d/.test(rollNo)) {
      return [];
    }

    if (!rollNo || !studentName || !hostel) {
      throw new Error(`Row ${index + 2} has missing values.`);
    }

    if (seenRollNos.has(rollNo)) {
      throw new Error(`Duplicate roll number found in import: ${rollNo}`);
    }

    seenRollNos.add(rollNo);

    return [{
      rollNo,
      studentName,
      hostel,
      wing,
      roomNo,
      phoneNo,
      department,
      year,
      branch: department,
      yearBranch: `${year} · ${department}`,
    } satisfies ParsedStudent];
  });
}

export async function importRoster(args: {
  actorId: string;
  filename: string;
  buffer: Buffer;
}) {
  const job = await prisma.importJob.create({
    data: {
      actorId: args.actorId,
      filename: args.filename,
      status: ImportStatus.PENDING,
    },
  });

  try {
    const students = parseRosterBuffer(args.buffer);
    const existingRollNos = new Set(
      (
        await prisma.student.findMany({
          where: {
            rollNo: {
              in: students.map((student) => student.rollNo),
            },
          },
          select: { rollNo: true },
        })
      ).map((student) => student.rollNo),
    );

    const createdCount = students.filter((student) => !existingRollNos.has(student.rollNo)).length;
    const updatedCount = students.length - createdCount;

    for (let index = 0; index < students.length; index += 100) {
      const chunk = students.slice(index, index + 100);

      await prisma.$transaction(
        chunk.map((student) =>
          prisma.student.upsert({
            where: { rollNo: student.rollNo },
            update: {
              studentName: student.studentName,
              hostel: student.hostel,
              wing: student.wing,
              roomNo: student.roomNo,
              phoneNo: student.phoneNo,
              department: student.department,
              year: student.year,
              branch: student.branch,
              yearBranch: student.yearBranch,
            },
            create: student,
          }),
        ),
      );
    }

    const hostels = [...new Set(students.map((student) => student.hostel))];
    const wings = new Map<string, Set<string>>();
    const departments = new Map<string, Set<string>>();

    for (const student of students) {
      const hostelWings = wings.get(student.hostel) ?? new Set<string>();
      hostelWings.add(student.wing);
      wings.set(student.hostel, hostelWings);

      const hostelDepartments = departments.get(student.hostel) ?? new Set<string>();
      hostelDepartments.add(student.department);
      departments.set(student.hostel, hostelDepartments);
    }

    await prisma.$transaction([
      ...hostels.map((value) =>
        prisma.group.upsert({
          where: {
            family_scopeType_hostel_value: {
              family: FamilyScope.HOSTEL,
              scopeType: GroupScopeType.HOSTEL,
              hostel: value,
              value,
            },
          },
          create: {
            family: FamilyScope.HOSTEL,
            scopeType: GroupScopeType.HOSTEL,
            hostel: value,
            value,
            label: value,
          },
          update: {
            label: value,
          },
        }),
      ),
      ...[...wings.entries()].flatMap(([hostel, hostelWings]) =>
        [...hostelWings].map((wing) =>
          prisma.group.upsert({
            where: {
              family_scopeType_hostel_value: {
                family: FamilyScope.HOSTEL,
                scopeType: GroupScopeType.WING,
                hostel,
                value: wing,
              },
            },
            create: {
              family: FamilyScope.HOSTEL,
              scopeType: GroupScopeType.WING,
              hostel,
              value: wing,
              label: `${hostel} · ${formatWingLabel(wing)}`,
            },
            update: {
              label: `${hostel} · ${formatWingLabel(wing)}`,
            },
          }),
        ),
      ),
      ...[...departments.entries()].flatMap(([hostel, hostelDepartments]) =>
        [...hostelDepartments].map((department) =>
          prisma.group.upsert({
            where: {
              family_scopeType_hostel_value: {
                family: FamilyScope.HOSTEL,
                scopeType: GroupScopeType.DEPARTMENT,
                hostel,
                value: department,
              },
            },
            create: {
              family: FamilyScope.HOSTEL,
              scopeType: GroupScopeType.DEPARTMENT,
              hostel,
              value: department,
              label: `${hostel} · ${formatDepartmentLabel(department)}`,
            },
            update: {
              label: `${hostel} · ${formatDepartmentLabel(department)}`,
            },
          }),
        ),
      ),
      prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportStatus.COMPLETED,
          createdCount,
          updatedCount,
          summary: {
            totalRows: students.length,
          },
        },
      }),
      prisma.auditEvent.create({
        data: {
          actorId: args.actorId,
          type: AuditEventType.ROSTER_IMPORT,
          description: `Imported ${students.length} roster rows from ${args.filename}.`,
          payload: {
            filename: args.filename,
            createdCount,
            updatedCount,
          },
        },
      }),
    ]);

    return prisma.importJob.findUniqueOrThrow({
      where: { id: job.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportStatus.FAILED,
        failedCount: 1,
        errorMessage: message,
      },
    });

    throw error;
  }
}
