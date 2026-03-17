import bcrypt from "bcryptjs";
import { FamilyScope, GroupScopeType, UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  password: z.string().trim().min(6).optional(),
  isActive: z.boolean().optional(),
  managerId: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    return typeof value === "string" ? value.trim() : value;
  }, z.string().nullable().optional()),
  groupIds: z.preprocess((value) => {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
    );
  }, z.array(z.string()).optional()),
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

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer || (viewer.role !== UserRole.SUPERADMIN && viewer.role !== UserRole.ADMIN)) {
    return unauthorizedResponse("Not allowed.");
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "payload";
    return NextResponse.json(
      { error: `Invalid update payload: ${path} ${issue?.message ?? "is invalid"}.` },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (viewer.role === UserRole.ADMIN && existing.managerId !== viewer.id) {
    return unauthorizedResponse("Admins can update only their POCs.");
  }

  const selectedGroups = parsed.data.groupIds
    ? await prisma.group.findMany({
        where: { id: { in: parsed.data.groupIds } },
      })
    : null;

  if (selectedGroups && selectedGroups.length !== parsed.data.groupIds?.length) {
    return NextResponse.json({ error: "One or more groups were not found." }, { status: 400 });
  }

  if (
    selectedGroups &&
    selectedGroups.some((group) => group.family !== FamilyScope.HOSTEL)
  ) {
    return NextResponse.json({ error: "Only hostel groups are supported." }, { status: 400 });
  }

  if (
    selectedGroups &&
    existing.role === UserRole.ADMIN &&
    selectedGroups.some((group) => group.scopeType !== GroupScopeType.HOSTEL)
  ) {
    return NextResponse.json(
      { error: "Admins can only be assigned hostels." },
      { status: 400 },
    );
  }

  if (
    selectedGroups &&
    existing.role === UserRole.POC &&
    selectedGroups.some((group) => group.scopeType === GroupScopeType.HOSTEL)
  ) {
    return NextResponse.json(
      { error: "POCs can only be assigned wings or departments." },
      { status: 400 },
    );
  }

  if (selectedGroups && existing.role !== UserRole.SUPERADMIN && selectedGroups.length === 0) {
    return NextResponse.json(
      { error: "Assign at least one scope." },
      { status: 400 },
    );
  }

  if (selectedGroups && viewer.role === UserRole.ADMIN) {
    const viewerGroups = viewer.groupAssignments.map((assignment) => assignment.group);

    if (!canManagerCoverGroups(viewerGroups, selectedGroups)) {
      return NextResponse.json(
        { error: "The selected scope is outside the Admin assignment." },
        { status: 403 },
      );
    }
  }

  const passwordHash = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 10)
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (existing.role !== UserRole.SUPERADMIN && parsed.data.groupIds) {
      await tx.pOCGroupAssignment.deleteMany({
        where: { userId: existing.id },
      });
      await tx.pOCGroupAssignment.createMany({
        data: parsed.data.groupIds.map((groupId) => ({
          userId: existing.id,
          groupId,
        })),
      });
    }

    return tx.user.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        passwordHash,
        isActive: parsed.data.isActive,
        managerId: parsed.data.managerId,
      },
      include: {
        manager: true,
        groupAssignments: {
          include: { group: true },
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      loginId: updated.loginId,
      name: updated.name,
      role: updated.role,
      familyScope: updated.familyScope,
      manager: updated.manager ? { id: updated.manager.id, name: updated.manager.name } : null,
      subgroupScope: updated.groupAssignments.map((assignment) => assignment.group.label),
      assignedGroups: updated.groupAssignments.map((assignment) => ({
        id: assignment.group.id,
        family: assignment.group.family,
        scopeType: assignment.group.scopeType,
        hostel: assignment.group.hostel,
        value: assignment.group.value,
        label: assignment.group.label,
      })),
      isActive: updated.isActive,
    },
  });
}
