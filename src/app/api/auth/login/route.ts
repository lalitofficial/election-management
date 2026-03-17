import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials payload." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { loginId: parsed.data.loginId },
    include: {
      groupAssignments: {
        include: { group: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      familyScope: user.familyScope,
      subgroupScope: user.groupAssignments.map((assignment) => assignment.group.label),
    },
  });
}
