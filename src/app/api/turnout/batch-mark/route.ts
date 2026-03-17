import { TurnoutAction } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTurnout } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

const batchMarkSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(200),
});

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = batchMarkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const results = await Promise.allSettled(
    parsed.data.studentIds.map((id) => updateTurnout(viewer, id, TurnoutAction.MARK)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, succeeded, failed });
}
