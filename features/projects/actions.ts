"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { db } from "@/lib/db";
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

function revalidateApp() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.projectCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidProject);

  const duplicate = await db.project.findFirst({
    where: { userId: user.id, name: parsed.data.name },
  });
  if (duplicate) return fail(a.projectDup);

  const project = await db.project.create({
    data: { userId: user.id, ...parsed.data },
  });
  revalidateApp();
  return { ok: true, data: { id: project.id } };
}

export async function updateProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.projectUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidProject);
  const { id, ...fields } = parsed.data;

  const existing = await db.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) return fail(a.projectNotFound);

  if (fields.name && fields.name !== existing.name) {
    const duplicate = await db.project.findFirst({
      where: { userId: user.id, name: fields.name, id: { not: id } },
    });
    if (duplicate) return fail(a.projectDup);
  }

  await db.project.update({ where: { id }, data: fields });
  revalidateApp();
  return { ok: true, data: { id } };
}

export async function deleteProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.taskIdSchema.safeParse(input);
  if (!parsed.success) return fail(a.projectShort);
  const { id } = parsed.data;

  const existing = await db.project.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { tasks: true } } },
  });
  if (!existing) return fail(a.projectNotFound);

  // Tasks are NOT deleted: they move back to Inbox (projectId SetNull).
  await db.project.delete({ where: { id } });
  revalidateApp();
  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function createTag(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.tagCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidTag);

  const duplicate = await db.tag.findFirst({
    where: { userId: user.id, name: parsed.data.name },
  });
  if (duplicate) return fail(a.tagDup);

  const tag = await db.tag.create({ data: { userId: user.id, ...parsed.data } });
  revalidateApp();
  return { ok: true, data: { id: tag.id } };
}

export async function updateTag(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.tagUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? a.invalidTag);
  const { id, ...fields } = parsed.data;

  const existing = await db.tag.findFirst({ where: { id, userId: user.id } });
  if (!existing) return fail(a.tagNotFound);

  if (fields.name && fields.name !== existing.name) {
    const duplicate = await db.tag.findFirst({
      where: { userId: user.id, name: fields.name, id: { not: id } },
    });
    if (duplicate) return fail(a.tagDup);
  }

  await db.tag.update({ where: { id }, data: fields });
  revalidateApp();
  return { ok: true, data: { id } };
}

export async function deleteTag(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, a } = await strings();
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.taskIdSchema.safeParse(input);
  if (!parsed.success) return fail(a.tagShort);

  const existing = await db.tag.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!existing) return fail(a.tagNotFound);

  await db.tag.delete({ where: { id: existing.id } });
  revalidateApp();
  return { ok: true, data: { id: existing.id } };
}
