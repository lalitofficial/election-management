import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all routes except login, static assets, and NextAuth internals.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|api/auth).*)"],
};
