import { NextResponse } from "next/server";

import { getHostelStudents } from "@/lib/election-data";
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
  const hostel = searchParams.get("hostel")?.trim();

  if (!hostel) {
    return NextResponse.json({ error: "hostel is required." }, { status: 400 });
  }

  const students = await getHostelStudents(viewer, hostel);

  return NextResponse.json({ students });
}
