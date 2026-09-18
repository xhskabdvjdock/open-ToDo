// Pure query-building / sorting helpers for tasks.
// NOTE: this module must stay free of "use server" so it can export
// synchronous functions. Server Actions live in ./actions.ts.

import { Prisma, type Task } from "@prisma/client";
import type { TaskQuery } from "@/lib/validations";
import { dayBounds, upcomingWindow } from "@/lib/dates";

const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function buildTaskWhere(userId: string, query: TaskQuery, timezone: string) {
  const where: Prisma.TaskWhereInput = { userId };

  if (query.status !== "ALL") where.status = query.status;

  if (query.priority !== "ALL") where.priority = query.priority;

  if (query.projectId === "NONE") where.projectId = null;
  else if (query.projectId !== "ALL") where.projectId = query.projectId;

  if (query.tagId !== "ALL") {
    where.tags = { some: { tagId: query.tagId } };
  }

  if (query.q.trim() !== "") {
    const q = query.q.trim();
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { tags: { some: { tag: { name: { contains: q } } } } },
          { project: { name: { contains: q } } },
        ],
      },
    ];
  }

  const now = new Date();
  if (query.due === "OVERDUE") {
    const { start } = dayBounds(timezone, now);
    where.dueDate = { lt: start };
    where.status = { not: "COMPLETED" };
  } else if (query.due === "TODAY") {
    const { start, end } = dayBounds(timezone, now);
    where.dueDate = { gte: start, lt: end };
  } else if (query.due === "UPCOMING") {
    const { start } = upcomingWindow(timezone, now);
    where.dueDate = { gte: start };
  } else if (query.due === "NO_DATE") {
    where.dueDate = null;
  }

  return where;
}

export function sortTasks<T extends Task>(
  tasks: T[],
  sort: TaskQuery["sort"],
  direction: "ASC" | "DESC",
): T[] {
  const dir = direction === "ASC" ? 1 : -1;
  const sorted = [...tasks];
  switch (sort) {
    case "DUE_DATE":
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return (a.order - b.order) * dir;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (a.dueDate.getTime() - b.dueDate.getTime()) * dir || a.order - b.order;
      });
      break;
    case "PRIORITY":
      sorted.sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir || a.order - b.order,
      );
      break;
    case "CREATED":
      sorted.sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * dir);
      break;
    case "UPDATED":
      sorted.sort((a, b) => (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir);
      break;
    case "MANUAL":
    default:
      sorted.sort((a, b) => (a.order - b.order) * dir);
      break;
  }
  return sorted;
}
