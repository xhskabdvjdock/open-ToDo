// End-to-end data verification: exercises the REAL database with the same
// queries the app uses (auth lookup, CRUD, counts, stats, cascade delete).
// Run: node scripts/verify.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
};

const email = `verify-${Date.now()}@example.com`;
const passwordHash = await bcrypt.hash("verify-pass-123", 12);
const user = await db.user.create({
  data: { email, name: "Verify", passwordHash, timezone: "Asia/Riyadh" },
});
assert(!!user.id, "user created");

// Auth lookup path (same as Credentials authorize)
const found = await db.user.findUnique({ where: { email } });
assert(found && (await bcrypt.compare("verify-pass-123", found.passwordHash)), "password verifies");

const project = await db.project.create({
  data: { userId: user.id, name: "University", color: "#4f46e5", icon: "book-open" },
});
const tag = await db.tag.create({ data: { userId: user.id, name: "Frontend", color: "#0ea5e9" } });

const t1 = await db.task.create({
  data: {
    userId: user.id,
    title: "Finish cybersecurity project",
    projectId: project.id,
    priority: "HIGH",
    dueDate: new Date(),
    order: 1,
    tags: { create: [{ tagId: tag.id }] },
    activities: { create: { userId: user.id, action: "CREATED" } },
  },
});
const t2 = await db.task.create({
  data: { userId: user.id, title: "Inbox task", order: 2 },
});
assert(!!t1.id && !!t2.id, "tasks created");

// Complete + reopen cycle
await db.task.update({
  where: { id: t1.id },
  data: { status: "COMPLETED", statusBefore: "TODO", completedAt: new Date() },
});
const completed = await db.task.findFirst({ where: { id: t1.id, userId: user.id } });
assert(completed.status === "COMPLETED" && completed.statusBefore === "TODO", "complete stores previous status");

await db.task.update({
  where: { id: t1.id },
  data: { status: completed.statusBefore ?? "TODO", statusBefore: null, completedAt: null },
});
const reopened = await db.task.findFirst({ where: { id: t1.id } });
assert(reopened.status === "TODO", "reopen restores previous status");

// Sidebar counts (same queries as layout)
const inbox = await db.task.count({
  where: { userId: user.id, projectId: null, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
});
assert(inbox === 1, `inbox count is real (${inbox})`);

// Search across title/description/tags/project
const q = "cyber";
const hits = await db.task.findMany({
  where: {
    userId: user.id,
    OR: [
      { title: { contains: q } },
      { description: { contains: q } },
      { tags: { some: { tag: { name: { contains: q } } } } },
      { project: { name: { contains: q } } },
    ],
  },
});
assert(hits.length === 1, "search finds the task");

// Project progress from real data
const total = await db.task.count({ where: { projectId: project.id, status: { not: "ARCHIVED" } } });
assert(total === 1, `project progress denominator is real (${total})`);

// Manual order persists
await db.task.update({ where: { id: t2.id }, data: { order: 0.5 } });
const ordered = await db.task.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
assert(ordered[0].id === t2.id, "manual order persists and sorts");

// Delete + restore (undo path: recreate with same id)
const snap = await db.task.findFirst({ where: { id: t2.id }, include: { tags: true } });
await db.task.delete({ where: { id: t2.id } });
assert(!(await db.task.findFirst({ where: { id: t2.id } })), "delete removes the row");
await db.task.create({
  data: {
    id: snap.id,
    userId: snap.userId,
    title: snap.title,
    status: snap.status,
    priority: snap.priority,
    order: snap.order,
  },
});
assert(!!(await db.task.findFirst({ where: { id: t2.id } })), "undo restores the task");

// Authorization isolation: another user cannot see these rows
const other = await db.user.create({
  data: { email: `other-${Date.now()}@example.com`, passwordHash, timezone: "UTC" },
});
const leak = await db.task.findFirst({ where: { id: t1.id, userId: other.id } });
assert(leak === null, "user isolation enforced at query level");

// Cascade: deleting account removes everything
await db.user.delete({ where: { id: other.id } });
await db.user.delete({ where: { id: user.id } });
const leftovers = await db.task.count({ where: { userId: user.id } });
const projectsLeft = await db.project.count({ where: { userId: user.id } });
assert(leftovers === 0 && projectsLeft === 0, "account deletion cascades");

await db.$disconnect();
console.log(process.exitCode ? "VERIFICATION FAILED" : "ALL CHECKS PASSED");
