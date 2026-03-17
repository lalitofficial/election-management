import bcrypt from "bcryptjs";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours — covers a full election day
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Election Credentials",
      credentials: {
        loginId: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { loginId: parsed.data.loginId },
          include: {
            groupAssignments: {
              include: {
                group: true,
              },
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          familyScope: user.familyScope,
          subgroupScope: user.groupAssignments.map((assignment) => assignment.group.label),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.loginId = user.loginId;
        token.role = user.role;
        token.familyScope = user.familyScope;
        token.subgroupScope = user.subgroupScope;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.loginId = token.loginId;
        session.user.role = token.role;
        session.user.familyScope = token.familyScope ?? null;
        session.user.subgroupScope = token.subgroupScope ?? [];
      }

      return session;
    },
  },
};
