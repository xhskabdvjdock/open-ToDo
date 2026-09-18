import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { arNum, dayBounds, toLocalDateKey } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { FilterBar } from "@/components/tasks/filter-bar";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { Skeleton } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.todayTitle };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  // Filters (priority / project / tag / sort) still apply; the day window is
  // always "today" in the user's timezone.
  const query = parseTaskQuery(await searchParams, {});
  const [all, projects, tags] = await Promise.all([
    getTasks(user.id, { ...query, due: "ALL" }, user.timezone, { activeOnly: true }),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const { start, end } = dayBounds(user.timezone);
  const todayKey = toLocalDateKey(new Date(), user.timezone);
  const overdue = all.filter((task) => task.dueDate && task.dueDate < start);
  const today = all.filter((task) => {
    if (!task.dueDate) return false;
    const key = toLocalDateKey(task.dueDate, user.timezone);
    return task.dueDate >= start && task.dueDate < end && key === todayKey;
  });

  return (
    <div>
      <PageHeader
        title={p.todayTitle}
        description={
          overdue.length > 0
            ? p.todayDescBoth(arNum(overdue.length, locale), arNum(today.length, locale))
            : today.length > 0
              ? p.todayDescToday(arNum(today.length, locale))
              : p.todayDescCalm
        }
      />
      <div className="mb-4 space-y-3">
        <QuickAdd dueDate={todayKey} />
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={projects} tags={tags} showStatus={false} showDue={false} />
        </Suspense>
      </div>

      {overdue.length > 0 ? (
        <section aria-label={p.overdueLabel} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
            {p.overdueLabel} · {arNum(overdue.length, locale)}
          </h2>
          <TaskList tasks={overdue} timezone={user.timezone} />
        </section>
      ) : null}

      <section aria-label={p.dueTodayLabel}>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {p.dueTodayLabel} · {arNum(today.length, locale)}
        </h2>
        <TaskList
          tasks={today}
          timezone={user.timezone}
          empty={{
            title: p.todayEmpty,
            description: overdue.length > 0 ? p.todayEmptyOverdue : p.todayEmptyCalm,
          }}
        />
      </section>
    </div>
  );
}
