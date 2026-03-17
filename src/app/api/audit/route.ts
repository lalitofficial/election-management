import { NextResponse } from "next/server";

import { getDashboardPayload } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer) {
    return unauthorizedResponse();
  }

  const payload = await getDashboardPayload(viewer);
  return NextResponse.json({ audit: payload.recentAudit });
}
