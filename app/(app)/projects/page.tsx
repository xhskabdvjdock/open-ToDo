import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { getDict } from "@/lib/i18n/server";
import { dayBounds } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { ProjectsView } from "@/components/projects/projects-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.projects.pageTitle };
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { t } = await getDict();
  const params = await searchParams;
  const tab = params.tab === "tags" ? "tags" : "projects";
  const { start } = dayBounds(user.timezone);

  const [projects, tags] = await Promise.all([
    db.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            tasks: { where: { status: { not: "ARCHIVED" } } },
          },
        },
        tasks: {
          where: { status: { not: "ARCHIVED" } },
          select: { status: true, dueDate: true },
        },
      },
    }),
    db.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title={t.projects.pageTitle} description={t.projects.pageDesc} />
      <ProjectsView
        initialTab={tab}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          icon: p.icon,
          total: p._count.tasks,
          done: p.tasks.filter((task) => task.status === "COMPLETED").length,
          active: p.tasks.filter((task) => task.status !== "COMPLETED").length,
          overdue: p.tasks.filter((task) => task.status !== "COMPLETED" && task.dueDate && task.dueDate < start).length,
        }))}
        tags={tags.map((tg) => ({ id: tg.id, name: tg.name, color: tg.color, taskCount: tg._count.tasks }))}
      />
    </div>
  );
}
