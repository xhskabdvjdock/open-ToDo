"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/field";
import { useLocale } from "@/components/locale-provider";

export type FilterOptions = {
  projects: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  showStatus?: boolean;
  showDue?: boolean;
  showProject?: boolean;
};

/**
 * Real server-driven filters: every change updates the URL query string and
 * the Server Component re-queries the database. No client-side fakery.
 */
export function FilterBar({ projects, tags, showStatus = true, showDue = true, showProject = true }: FilterOptions) {
  const { t } = useLocale();
  const f = t.filter;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "ALL" || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function reset() {
    router.replace(pathname, { scroll: false });
  }

  const hasActive = ["status", "priority", "projectId", "tagId", "due", "sort", "q"].some((k) =>
    params.get(k),
  );

  const selectClass = "h-8 w-auto text-[13px]";

  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label={f.label}>
      {showStatus ? (
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="sr-only">{f.statusSr}</span>
          <Select
            aria-label={f.status}
            className={selectClass}
            value={params.get("status") ?? "ALL"}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="ALL">{f.allStatuses}</option>
            <option value="TODO">{f.todo}</option>
            <option value="IN_PROGRESS">{f.inProgress}</option>
            <option value="COMPLETED">{f.completed}</option>
            <option value="ARCHIVED">{f.archived}</option>
          </Select>
        </label>
      ) : null}

      <Select
        aria-label={f.byPriority}
        className={selectClass}
        value={params.get("priority") ?? "ALL"}
        onChange={(e) => set("priority", e.target.value)}
      >
        <option value="ALL">{f.allPriorities}</option>
        <option value="URGENT">{f.urgent}</option>
        <option value="HIGH">{f.high}</option>
        <option value="MEDIUM">{f.medium}</option>
        <option value="LOW">{f.low}</option>
      </Select>

      {showProject ? (
        <Select
          aria-label={f.byProject}
          className={selectClass}
          value={params.get("projectId") ?? "ALL"}
          onChange={(e) => set("projectId", e.target.value)}
        >
          <option value="ALL">{f.allProjects}</option>
          <option value="NONE">{f.inboxNone}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      ) : null}

      <Select
        aria-label={f.byTag}
        className={selectClass}
        value={params.get("tagId") ?? "ALL"}
        onChange={(e) => set("tagId", e.target.value)}
      >
        <option value="ALL">{f.allTags}</option>
        {tags.map((tg) => (
          <option key={tg.id} value={tg.id}>
            #{tg.name}
          </option>
        ))}
      </Select>

      {showDue ? (
        <Select
          aria-label={f.byDue}
          className={selectClass}
          value={params.get("due") ?? "ALL"}
          onChange={(e) => set("due", e.target.value)}
        >
          <option value="ALL">{f.anyDue}</option>
          <option value="OVERDUE">{f.overdue}</option>
          <option value="TODAY">{f.dueToday}</option>
          <option value="UPCOMING">{f.upcoming}</option>
          <option value="NO_DATE">{f.noDate}</option>
        </Select>
      ) : null}

      <Select
        aria-label={f.sort}
        className={selectClass}
        value={params.get("sort") ?? "MANUAL"}
        onChange={(e) => set("sort", e.target.value)}
      >
        <option value="MANUAL">{f.manual}</option>
        <option value="DUE_DATE">{f.byDueDate}</option>
        <option value="PRIORITY">{f.sortByPriority}</option>
        <option value="CREATED">{f.byCreated}</option>
        <option value="UPDATED">{f.byUpdated}</option>
      </Select>

      <button
        type="button"
        aria-label={f.toggleDirection}
        title={f.toggleDirection}
        onClick={() => set("direction", (params.get("direction") ?? "ASC") === "ASC" ? "DESC" : "ASC")}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ArrowUpDown size={14} aria-hidden />
      </button>

      {hasActive ? (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <RotateCcw size={13} aria-hidden />
          {f.clear}
        </button>
      ) : null}
    </div>
  );
}
