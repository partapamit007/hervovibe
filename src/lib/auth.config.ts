import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Prisma or bcrypt imports.
// Used by middleware; auth.ts extends this with the Credentials provider.
export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.rank = user.rank;
        token.memberId = user.memberId;
      }
      return token;
    },
    session({ session, token }: any) {
      if (token) {
        session.user.role = token.role;
        session.user.rank = token.rank;
        session.user.memberId = token.memberId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
} satisfies NextAuthConfig;
