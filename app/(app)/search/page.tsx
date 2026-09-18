import { Suspense } from "react";
import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { parseTaskQuery } from "@/lib/task-query";
import { getTasks } from "@/features/tasks/actions";
import { getDict } from "@/lib/i18n/server";
import { arNum } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { FilterBar } from "@/components/tasks/filter-bar";
import { TaskList } from "@/components/tasks/task-list";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.searchTitle };
}

/**
 * Real search across task titles, descriptions, tags and project names.
 * Queries the database on every keystroke (debounced) — never filters
 * hard-coded data.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  const query = parseTaskQuery(await searchParams, {});
  const [tasks, projects, tags] = await Promise.all([
    query.q.trim() === "" ? Promise.resolve([]) : getTasks(user.id, query, user.timezone),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title={query.q ? p.searchResults(query.q) : p.searchTitle}
        description={
          query.q
            ? p.searchDesc(arNum(tasks.length, locale))
            : p.searchEmpty
        }
      />
      <div className="mb-4">
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <FilterBar projects={projects} tags={tags} />
        </Suspense>
      </div>
      {query.q.trim() === "" ? (
        <EmptyState
          icon={SearchIcon}
          title={p.startTyping}
          description={p.startTypingDesc}
        />
      ) : (
        <TaskList
          tasks={tasks}
          timezone={user.timezone}
          empty={{ title: p.noMatches, description: p.noMatchesDesc(query.q) }}
        />
      )}
    </div>
  );
}
