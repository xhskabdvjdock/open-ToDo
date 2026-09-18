"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser, signOut } from "@/auth";
import { db } from "@/lib/db";
import { isValidTimeZone } from "@/lib/dates";
import { getSchemas } from "@/lib/validations";
import { actionLocale } from "@/lib/i18n/server";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function strings() {
  const locale = await actionLocale();
  return { schemas: getSchemas(locale), a: (locale === "en" ? en : ar).actions };
}

export async function updateProfile(input: unknown): Promise<ActionResult<null>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidInput);
  if (!isValidTimeZone(parsed.data.timezone)) return fail(a.unknownTz);

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name ?? null, timezone: parsed.data.timezone },
  });
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function changePassword(input: unknown): Promise<ActionResult<null>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.passwordChangeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidInput);

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return fail(a.accountNotFound);
  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return fail(a.wrongCurrentPw);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  return { ok: true, data: null };
}

export async function deleteAccount(input: unknown): Promise<ActionResult<null>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.deleteAccountSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.badConfirm);

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return fail(a.accountNotFound);
  const ok = await bcrypt.compare(parsed.data.password, record.passwordHash);
  if (!ok) return fail(a.wrongPw);

  // Cascades to projects, tasks, tags and activity (see schema relations).
  await db.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/login" });
  return { ok: true, data: null };
}
