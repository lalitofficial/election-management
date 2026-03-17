import { DefaultSession } from "next-auth";

import { FamilyScope, UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    loginId: string;
    role: UserRole;
    familyScope: FamilyScope | null;
    subgroupScope: string[];
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      loginId: string;
      role: UserRole;
      familyScope: FamilyScope | null;
      subgroupScope: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    loginId: string;
    role: UserRole;
    familyScope: FamilyScope | null;
    subgroupScope: string[];
  }
}
