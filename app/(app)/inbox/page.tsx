import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { taskCountLabel } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { FilterBar } from "@/components/tasks/filter-bar";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { Skeleton } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.inboxTitle };
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  const query = parseTaskQuery(await searchParams, { projectId: "NONE" });
  const [tasks, projects, tags] = await Promise.all([
    getTasks(user.id, query, user.timezone, { activeOnly: true }),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader title={p.inboxTitle} description={p.inboxDesc} />
      <div className="mb-4 space-y-3">
        <QuickAdd projectId={null} />
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={projects} tags={tags} showStatus={false} showProject={false} />
        </Suspense>
      </div>
      <TaskList
        tasks={tasks}
        timezone={user.timezone}
        reorderable={query.sort === "MANUAL" && query.direction === "ASC"}
        empty={{ title: p.inboxEmpty, description: p.inboxEmptyDesc }}
      />
      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500" aria-live="polite">
        {taskCountLabel(tasks.length, locale)} · {p.inboxFoot}
      </p>
    </div>
  );
}
