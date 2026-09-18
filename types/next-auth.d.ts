import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      timezone?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    timezone?: string;
  }
}
