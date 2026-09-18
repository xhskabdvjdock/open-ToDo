import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dayBounds, upcomingWindow } from "@/lib/dates";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Workspace shell: protects every nested route server-side, then loads the
 * real sidebar data (counts, projects, tags) scoped to the signed-in user.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, timezone: true },
  });
  if (!user) redirect("/login");
  const timezone = user.timezone || "UTC";

  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBounds(timezone, now);
  const { start: upcomingStart } = upcomingWindow(timezone, now);

  const [inbox, today, upcoming, completed, projects, tags] = await Promise.all([
    db.task.count({
      where: { userId, projectId: null, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
    }),
    db.task.count({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        dueDate: { gte: todayStart, lt: todayEnd },
      },
    }),
    db.task.count({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        dueDate: { gte: upcomingStart },
      },
    }),
    db.task.count({ where: { userId, status: "COMPLETED" } }),
    db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        _count: {
          select: {
            tasks: { where: { status: { notIn: ["COMPLETED", "ARCHIVED"] } } },
          },
        },
      },
    }),
    db.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      timezone={timezone}
      counts={{ inbox, today, upcoming, completed }}
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        activeCount: p._count.tasks,
      }))}
      tags={tags}
    >
      {children}
    </AppShell>
  );
}
