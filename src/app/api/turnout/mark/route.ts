import { TurnoutAction } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTurnout } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

const turnoutSchema = z.object({
  studentId: z.string().min(1),
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
  const parsed = turnoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
  }

  try {
    const student = await updateTurnout(viewer, parsed.data.studentId, TurnoutAction.MARK);
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark turnout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
