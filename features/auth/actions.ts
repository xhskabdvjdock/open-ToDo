"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { signOut } from "@/auth";
import { getSchemas } from "@/lib/validations";
import { actionLocale } from "@/lib/i18n/server";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";
import { isValidTimeZone } from "@/lib/dates";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/**
 * Register a new user. Real account creation: validates input server-side,
 * rejects duplicate emails, hashes the password with bcrypt, persists the
 * user, and returns success so the client can sign in.
 */
export async function register(input: unknown): Promise<ActionResult<{ email: string }>> {
  const locale = await actionLocale();
  const { registerSchema } = getSchemas(locale);
  const a = (locale === "en" ? en : ar).actions;

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? a.invalidInput);
  }
  const { name, email, password, timezone } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return fail(a.emailExists);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      name: name ?? null,
      email,
      passwordHash,
      timezone: timezone && isValidTimeZone(timezone) ? timezone : "UTC",
    },
  });

  return { ok: true, data: { email } };
}

export async function logout(): Promise<never> {
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
