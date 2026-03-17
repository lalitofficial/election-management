import { UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { importRoster } from "@/lib/roster";
import { getViewerFromSession, requireSession, unauthorizedResponse } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer || viewer.role !== UserRole.SUPERADMIN) {
    return unauthorizedResponse("Only SuperAdmin can import roster data.");
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A roster spreadsheet is required." }, { status: 400 });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });
  }

  try {
    const job = await importRoster({
      actorId: viewer.id,
      filename: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import roster.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
