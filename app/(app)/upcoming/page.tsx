import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks, type TaskWithRelations } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { arNum, dayBounds, diffDaysFromToday } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { FilterBar } from "@/components/tasks/filter-bar";
import { TaskList } from "@/components/tasks/task-list";
import { Skeleton } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.upcomingTitle };
}

type Group = { key: string; title: string; tasks: TaskWithRelations[] };

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  const query = parseTaskQuery(await searchParams, {});
  const [all, projects, tags] = await Promise.all([
    getTasks(user.id, { ...query, due: "ALL" }, user.timezone, { activeOnly: true }),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const { start } = dayBounds(user.timezone);
  const dated = all.filter((task) => task.dueDate && task.dueDate >= start);

  const buckets: Record<string, TaskWithRelations[]> = {
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  };
  for (const task of dated) {
    const diff = diffDaysFromToday(task.dueDate!, user.timezone);
    if (diff <= 0) buckets.today.push(task);
    else if (diff === 1) buckets.tomorrow.push(task);
    else if (diff <= 7) buckets.week.push(task);
    else buckets.later.push(task);
  }

  // Sections are built from real data — empty ones are not rendered.
  const groups: Group[] = [
    { key: "today", title: p.groupToday, tasks: buckets.today },
    { key: "tomorrow", title: p.groupTomorrow, tasks: buckets.tomorrow },
    { key: "week", title: p.groupWeek, tasks: buckets.week },
    { key: "later", title: p.groupLater, tasks: buckets.later },
  ].filter((g) => g.tasks.length > 0);

  return (
    <div>
      <PageHeader
        title={p.upcomingTitle}
        description={
          dated.length > 0
            ? p.upcomingDesc(arNum(dated.length, locale))
            : p.upcomingEmpty
        }
      />
      <div className="mb-5">
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={projects} tags={tags} showStatus={false} showDue={false} />
        </Suspense>
      </div>

      {groups.length === 0 ? (
        <TaskList
          tasks={[]}
          timezone={user.timezone}
          empty={{ title: p.noUpcoming, description: p.noUpcomingDesc }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {g.title} · {arNum(g.tasks.length, locale)}
              </h2>
              <TaskList tasks={g.tasks} timezone={user.timezone} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
