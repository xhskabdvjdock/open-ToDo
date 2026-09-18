import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { arNum } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { FilterBar } from "@/components/tasks/filter-bar";
import { TaskList } from "@/components/tasks/task-list";
import { Skeleton } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.completedTitle };
}

/**
 * Completed work: search, filter, restore (reopen to its previous status)
 * or permanently delete. Everything here is real data.
 */
export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  const query = parseTaskQuery(await searchParams, {
    status: "COMPLETED",
    sort: "UPDATED",
    direction: "DESC",
  });
  const [tasks, projects, tags] = await Promise.all([
    getTasks(user.id, query, user.timezone),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title={p.completedTitle}
        description={
          tasks.length > 0
            ? p.completedDesc(arNum(tasks.length, locale))
            : p.completedEmpty
        }
      />
      <div className="mb-4">
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={projects} tags={tags} showDue={false} />
        </Suspense>
      </div>
      <TaskList
        tasks={tasks}
        timezone={user.timezone}
        empty={{ title: p.noCompleted, description: p.noCompletedDesc }}
      />
    </div>
  );
}
