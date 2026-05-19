import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    rank: string;
    memberId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      rank: string;
      memberId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    rank: string;
    memberId: string | null;
  }
}
