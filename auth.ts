import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSchemas } from "@/lib/validations";
import type { Locale } from "@/lib/i18n/locale";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        let locale: Locale = "ar";
        try {
          if ((await cookies()).get("locale")?.value === "en") locale = "en";
        } catch {
          locale = "ar";
        }
        const parsed = getSchemas(locale).loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      // Keep JWT in sync when profile settings change.
      if (token.sub && (trigger === "signIn" || trigger === "update")) {
        const fresh = await db.user.findUnique({
          where: { id: token.sub },
          select: { name: true, email: true, timezone: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.email = fresh.email;
          (token as { timezone?: string }).timezone = fresh.timezone;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { timezone?: string }).timezone =
          (token as { timezone?: string }).timezone ?? "UTC";
      }
      return session;
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers used by Server Components / Server Actions (server-side only)
// ---------------------------------------------------------------------------

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    id: session.user.id,
    timezone: (session.user as { timezone?: string }).timezone ?? "UTC",
  };
}
