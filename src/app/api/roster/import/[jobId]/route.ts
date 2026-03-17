import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSession, unauthorizedResponse } from "@/lib/session";

type Params = Promise<{ jobId: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { jobId } = await params;
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}
