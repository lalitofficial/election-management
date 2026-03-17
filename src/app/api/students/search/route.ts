import { NextResponse } from "next/server";

import { searchStudents } from "@/lib/election-data";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const students = await searchStudents(viewer, {
    q: searchParams.get("q") ?? undefined,
    hostel: searchParams.get("hostel") ?? undefined,
    roomNo: searchParams.get("roomNo") ?? undefined,
  });

  return NextResponse.json({ students });
}
