import { FamilyScope } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { getFamilyBreakdown } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

type Params = Promise<{ family: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer) {
    return unauthorizedResponse();
  }

  const { family } = await params;

  if (!Object.values(FamilyScope).includes(family as FamilyScope)) {
    return NextResponse.json({ error: "Unknown family." }, { status: 400 });
  }

  const breakdown = await getFamilyBreakdown(viewer, family as FamilyScope);

  if (!breakdown) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  return NextResponse.json({ family, breakdown });
}
