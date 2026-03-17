import { AuditEventType, UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

const bulkVoteSchema = z.object({
  count: z.coerce.number().int().positive(),
  remarks: z.string().trim().min(3),
});

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer || viewer.role !== UserRole.SUPERADMIN) {
    return unauthorizedResponse("Only SuperAdmin can add bulk votes.");
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkVoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bulk vote payload." }, { status: 400 });
  }

  const entry = await prisma.$transaction(async (tx) => {
    const createdEntry = await tx.bulkVoteEntry.create({
      data: {
        actorId: viewer.id,
        count: parsed.data.count,
        remarks: parsed.data.remarks,
      },
    });

    await tx.auditEvent.create({
      data: {
        actorId: viewer.id,
        type: AuditEventType.BULK_VOTE,
        description: `Added ${parsed.data.count} bulk votes.`,
        reason: parsed.data.remarks,
        payload: {
          count: parsed.data.count,
          remarks: parsed.data.remarks,
        },
      },
    });

    return createdEntry;
  });

  return NextResponse.json({
    ok: true,
    entry: {
      id: entry.id,
      count: entry.count,
      remarks: entry.remarks,
      createdAt: entry.createdAt.toISOString(),
    },
  });
}
