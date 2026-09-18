"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Priority, type TaskStatus } from "@prisma/client";
import { requireUser } from "@/auth";
import { db } from "@/lib/db";
import { parseDateInputToUTC } from "@/lib/date-input";
import { getSchemas, type TaskQuery } from "@/lib/validations";
import { buildTaskWhere, sortTasks } from "./query";
import { formatDate } from "@/lib/dates";
import { actionLocale } from "@/lib/i18n/server";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function strings() {
  const locale = await actionLocale();
  return {
    locale,
    schemas: getSchemas(locale),
    t: locale === "en" ? en : ar,
  };
}

function revalidateApp() {
  // Task data appears in every workspace view; revalidate the whole
  // authenticated layout so counts, lists and stats never go stale.
  revalidatePath("/", "layout");
}

type TaskWithRelations = Prisma.TaskGetPayload<{
  include: { project: true; tags: { include: { tag: true } } };
}>;

async function assertOwnership(userId: string, id: string) {
  const task = await db.task.findFirst({
    where: { id, userId },
    include: { tags: true },
  });
  return task;
}

/** Next order value for a newly created task (appended at the end). */
async function nextOrder(userId: string): Promise<number> {
  const last = await db.task.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignInCreate);
  }

  const parsed = schemas.taskCreateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? a.invalidTask);
  }
  const { title, description, status, priority, dueDate, projectId, tagIds } = parsed.data;

  let due: Date | null = null;
  try {
    due = parseDateInputToUTC(dueDate, user.timezone);
  } catch {
    return fail(a.invalidDate);
  }

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return fail(a.noProject);
  }

  if (tagIds && tagIds.length > 0) {
    const count = await db.tag.count({ where: { id: { in: tagIds }, userId: user.id } });
    if (count !== tagIds.length) return fail(a.noTags);
  }

  const task = await db.task.create({
    data: {
      userId: user.id,
      title,
      description: description ?? null,
      status,
      priority,
      dueDate: due,
      completedAt: status === "COMPLETED" ? new Date() : null,
      projectId: projectId ?? null,
      order: await nextOrder(user.id),
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
      activities: { create: { userId: user.id, action: "CREATED" } },
    },
  });

  revalidateApp();
  return { ok: true, data: { id: task.id } };
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

export async function updateTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { locale, schemas, t } = await strings();
  const a = t.actions;
  const act = t.activity;
  const STATUS_LABEL = t.status;
  const PRIORITY_LABEL = t.priority;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignInEdit);
  }

  const parsed = schemas.taskUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? a.invalidTask);
  }
  const { id, tagIds, dueDate, projectId, ...fields } = parsed.data;

  const existing = await assertOwnership(user.id, id);
  if (!existing) return fail(a.taskNotFound);

  let due: Date | null | undefined;
  if (dueDate !== undefined) {
    try {
      due = parseDateInputToUTC(dueDate, user.timezone);
    } catch {
      return fail(a.invalidDate);
    }
  }

  if (projectId !== undefined && projectId !== null) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return fail(a.noProject);
  }

  if (tagIds) {
    const count = await db.tag.count({ where: { id: { in: tagIds }, userId: user.id } });
    if (count !== tagIds.length) return fail(a.noTags);
  }

  // Build a human-readable activity summary of what actually changed.
  const changes: string[] = [];
  if (fields.title !== undefined && fields.title !== existing.title) {
    changes.push(act.renamed(fields.title));
  }
  if (fields.status !== undefined && fields.status !== existing.status) {
    changes.push(act.statusChanged(STATUS_LABEL[existing.status], STATUS_LABEL[fields.status]));
  }
  if (fields.priority !== undefined && fields.priority !== existing.priority) {
    changes.push(act.priorityChanged(PRIORITY_LABEL[existing.priority], PRIORITY_LABEL[fields.priority]));
  }
  if (due !== undefined && (due?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null)) {
    changes.push(due ? act.dueSet(formatDate(due, user.timezone, locale)) : act.dueRemoved);
  }
  if (projectId !== undefined && projectId !== existing.projectId) {
    changes.push(projectId ? act.movedProject : act.movedInbox);
  }

  const nextStatus = fields.status ?? existing.status;
  const wasCompleted = existing.status === "COMPLETED";
  const willBeCompleted = nextStatus === "COMPLETED";

  await db.$transaction([
    db.task.update({
      where: { id },
      data: {
        ...fields,
        description: fields.description === undefined ? undefined : (fields.description ?? null),
        projectId: projectId === undefined ? undefined : (projectId ?? null),
        dueDate: due,
        completedAt:
          willBeCompleted && !wasCompleted
            ? new Date()
            : !willBeCompleted && wasCompleted
              ? null
              : undefined,
        statusBefore:
          willBeCompleted && !wasCompleted
            ? existing.status
            : !willBeCompleted
              ? null
              : undefined,
        ...(tagIds
          ? {
              tags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
    }),
    ...(changes.length > 0
      ? [
          db.taskActivity.create({
            data: {
              taskId: id,
              userId: user.id,
              action: willBeCompleted && !wasCompleted ? "COMPLETED" : "UPDATED",
              detail: changes.join(" · "),
            },
          }),
        ]
      : []),
  ]);

  revalidateApp();
  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------------
// COMPLETE / REOPEN (toggle with optimistic UI support + rollback on error)
// ---------------------------------------------------------------------------

export async function toggleTask(input: unknown): Promise<ActionResult<{ id: string; completed: boolean }>> {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.taskIdSchema.safeParse(input);
  if (!parsed.success) return fail(a.invalidTaskShort);
  const { id } = parsed.data;

  const existing = await assertOwnership(user.id, id);
  if (!existing) return fail(a.taskNotFound);

  if (existing.status === "COMPLETED") {
    const restored = existing.statusBefore ?? "TODO";
    await db.$transaction([
      db.task.update({
        where: { id },
        data: { status: restored, statusBefore: null, completedAt: null },
      }),
      db.taskActivity.create({
        data: { taskId: id, userId: user.id, action: "REOPENED", detail: t.activity.reopenedTo(t.status[restored]) },
      }),
    ]);
    revalidateApp();
    return { ok: true, data: { id, completed: false } };
  }

  await db.$transaction([
    db.task.update({
      where: { id },
      data: { status: "COMPLETED", statusBefore: existing.status, completedAt: new Date() },
    }),
    db.taskActivity.create({
      data: { taskId: id, userId: user.id, action: "COMPLETED" },
    }),
  ]);
  revalidateApp();
  return { ok: true, data: { id, completed: true } };
}

// ---------------------------------------------------------------------------
// DELETE (with real Undo via snapshot restore)
// ---------------------------------------------------------------------------

export type DeletedTaskSnapshot = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  statusBefore: TaskStatus | null;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string | null;
  order: number;
  tagIds: string[];
};

export async function deleteTask(input: unknown): Promise<ActionResult<{ snapshot: DeletedTaskSnapshot }>> {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.taskIdSchema.safeParse(input);
  if (!parsed.success) return fail(a.invalidTaskShort);
  const { id } = parsed.data;

  const existing = await db.task.findFirst({
    where: { id, userId: user.id },
    include: { tags: true },
  });
  if (!existing) return fail(a.taskNotFound);

  const snapshot: DeletedTaskSnapshot = {
    id: existing.id,
    title: existing.title,
    description: existing.description,
    status: existing.status,
    statusBefore: existing.statusBefore,
    priority: existing.priority,
    dueDate: existing.dueDate?.toISOString() ?? null,
    completedAt: existing.completedAt?.toISOString() ?? null,
    projectId: existing.projectId,
    order: existing.order,
    tagIds: existing.tags.map((tg) => tg.tagId),
  };

  await db.task.delete({ where: { id } });
  revalidateApp();
  return { ok: true, data: { snapshot } };
}

export async function restoreTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const parsed = schemas.taskUpdateSchema
    .pick({ id: true })
    .safeParse(typeof input === "object" && input !== null && "id" in input ? { id: (input as { id: unknown }).id } : input);
  if (!parsed.success) return fail(a.invalidTaskShort);

  const snap = (input as { snapshot: DeletedTaskSnapshot }).snapshot;
  if (!snap || snap.id !== parsed.data.id) return fail(a.nothingToRestore);

  const clash = await db.task.findFirst({ where: { id: snap.id } });
  if (clash) return fail(a.taskExists);

  // Tags may have been deleted meanwhile — only reconnect surviving ones.
  const surviving = snap.tagIds.length
    ? await db.tag.findMany({ where: { id: { in: snap.tagIds }, userId: user.id }, select: { id: true } })
    : [];

  await db.task.create({
    data: {
      id: snap.id,
      userId: user.id,
      title: snap.title,
      description: snap.description,
      status: snap.status,
      statusBefore: snap.statusBefore,
      priority: snap.priority,
      dueDate: snap.dueDate ? new Date(snap.dueDate) : null,
      completedAt: snap.completedAt ? new Date(snap.completedAt) : null,
      projectId: snap.projectId,
      order: snap.order,
      tags: { create: surviving.map((tg) => ({ tagId: tg.id })) },
      activities: { create: { userId: user.id, action: "CREATED", detail: a.restoredAfterDelete } },
    },
  });

  revalidateApp();
  return { ok: true, data: { id: snap.id } };
}

// ---------------------------------------------------------------------------
// MANUAL REORDER (persisted — used by both drag & drop and arrow buttons)
// ---------------------------------------------------------------------------

export async function reorderTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(a.mustSignIn);
  }
  const schema = schemas.taskIdSchema.extend({
    beforeId: schemas.taskIdSchema.shape.id.nullable().optional(),
    afterId: schemas.taskIdSchema.shape.id.nullable().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(a.invalidReorder);
  const { id, beforeId, afterId } = parsed.data;

  const own = await db.task.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!own) return fail(a.taskNotFound);

  const neighbors = await db.task.findMany({
    where: { id: { in: [beforeId, afterId].filter(Boolean) as string[] }, userId: user.id },
    select: { id: true, order: true },
  });
  const before = neighbors.find((n) => n.id === beforeId);
  const after = neighbors.find((n) => n.id === afterId);

  let order: number;
  if (before && after) order = (before.order + after.order) / 2;
  else if (before) order = before.order + 1;
  else if (after) order = after.order - 1;
  else order = await nextOrder(user.id);

  await db.task.update({ where: { id }, data: { order } });
  revalidateApp();
  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------------
// SERVER-SIDE READS (used by Server Components — always scoped to the user)
// ---------------------------------------------------------------------------

export async function getTasks(
  userId: string,
  query: TaskQuery,
  timezone: string,
  opts?: { activeOnly?: boolean },
) {
  const where = buildTaskWhere(userId, query, timezone);
  if (opts?.activeOnly && query.status === "ALL") {
    // Views like Inbox / Today / Upcoming list actionable work only.
    // Completed & archived tasks live in their dedicated views.
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }
  const tasks = await db.task.findMany({
    where,
    include: { project: true, tags: { include: { tag: true } } },
    take: 300,
  });
  return sortTasks(tasks, query.sort, query.direction);
}

export type { TaskWithRelations };

// ---------------------------------------------------------------------------
// DETAIL (single task + activity timeline, ownership enforced)
// ---------------------------------------------------------------------------

export async function getTaskDetails(input: unknown) {
  const { schemas, t } = await strings();
  const a = t.actions;
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false as const, error: a.mustSignIn };
  }
  const parsed = schemas.taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: a.invalidTaskShort };

  const task = await db.task.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    include: {
      project: true,
      tags: { include: { tag: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!task) return { ok: false as const, error: a.taskNotFound };
  return { ok: true as const, data: task };
}
