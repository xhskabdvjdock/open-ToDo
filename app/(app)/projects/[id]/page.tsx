import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { arNum, dayBounds, taskCountLabel } from "@/lib/dates";
import { FilterBar } from "@/components/tasks/filter-bar";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { ProjectIcon } from "@/components/projects/project-icon";
import { ProjectActions } from "@/components/projects/project-actions";
import { Skeleton } from "@/components/ui/feedback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { t } = await getDict();
  const session = await auth();
  const userId = session?.user?.id;
  const project = userId
    ? await db.project.findFirst({ where: { id, userId }, select: { name: true } })
    : null;
  return { title: project?.name ?? t.projectDetail.fallbackTitle };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const pd = t.projectDetail;
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      tasks: {
        where: { status: { not: "ARCHIVED" } },
        select: { status: true, dueDate: true },
      },
    },
  });
  if (!project) notFound();

  const query = parseTaskQuery(await searchParams, { projectId: id });
  const [activeTasks, completedTasks, tags] = await Promise.all([
    getTasks(user.id, { ...query, projectId: id, status: "ALL" }, user.timezone, { activeOnly: true }),
    getTasks(
      user.id,
      { ...query, projectId: id, status: "COMPLETED", due: "ALL", sort: "UPDATED", direction: "DESC" },
      user.timezone,
    ),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const { start } = dayBounds(user.timezone);
  const total = project.tasks.length;
  const done = project.tasks.filter((task) => task.status === "COMPLETED").length;
  const overdue = project.tasks.filter(
    (task) => task.status !== "COMPLETED" && task.dueDate && task.dueDate < start,
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const pctLabel = locale === "ar" ? `${arNum(pct, locale)}٪` : `${pct}%`;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProjectIcon icon={project.icon} color={project.color} size={18} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {project.description || pd.noDescription}
            </p>
          </div>
        </div>
        <ProjectActions
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color,
            icon: project.icon,
            taskCount: total,
          }}
        />
      </div>

      <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{pd.progress}</span>
          <span className="tnum tabular-nums text-zinc-500 dark:text-zinc-400">
            {arNum(done, locale)} / {arNum(total, locale)} · {pctLabel}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={project.name}
        >
          <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{pd.remaining(taskCountLabel(total - done, locale))}</span>
          {overdue > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">{pd.overdue(taskCountLabel(overdue, locale))}</span>
          ) : null}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <QuickAdd projectId={project.id} />
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={[]} tags={tags} showStatus={false} showProject={false} />
        </Suspense>
      </div>

      <TaskList
        tasks={activeTasks}
        timezone={user.timezone}
        reorderable={query.sort === "MANUAL" && query.direction === "ASC"}
        empty={{ title: t.projects.noTasksInProject, description: t.projects.addFirstTask }}
      />

      {completedTasks.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
            {pd.completed(arNum(completedTasks.length, locale))}
          </summary>
          <div className="mt-2">
            <TaskList tasks={completedTasks} timezone={user.timezone} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
