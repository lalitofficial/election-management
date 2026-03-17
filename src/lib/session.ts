import { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  return getServerSession(authOptions);
}

export async function getViewerFromSession(session: Session) {
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      groupAssignments: {
        include: { group: true },
      },
      pocs: {
        include: {
          groupAssignments: {
            include: { group: true },
          },
        },
      },
      manager: true,
    },
  });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}
