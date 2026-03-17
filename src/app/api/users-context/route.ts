import { NextResponse } from "next/server";

import { getUsersContext } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";
import { UserRole } from "@/generated/prisma/client";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorizedResponse();

  const viewer = await getViewerFromSession(session);
  if (!viewer) return unauthorizedResponse();

  if (viewer.role === UserRole.POC) {
    return NextResponse.json({ users: [], availableGroups: [] });
  }

  return NextResponse.json(await getUsersContext(viewer));
}
