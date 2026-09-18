"use client";

import * as React from "react";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { ProjectFormModal } from "@/components/projects/project-form";
import { TagManager, type TagRow } from "@/components/projects/tag-manager";
import { arNum, taskCountLabel } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ProjectIcon } from "@/components/projects/project-icon";
import { EmptyState } from "@/components/ui/feedback";

export type ProjectCardData = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  total: number;
  done: number;
  active: number;
  overdue: number;
};

export function ProjectsView({
  projects,
  tags,
  initialTab,
}: {
  projects: ProjectCardData[];
  tags: TagRow[];
  initialTab: "projects" | "tags";
}) {
  const { locale, t } = useLocale();
  const p = t.projects;
  const [tab, setTab] = React.useState(initialTab);
  const [showNew, setShowNew] = React.useState(false);

  // Follow server-driven tab (?tab=tags) without an effect.
  const [lastTab, setLastTab] = React.useState(initialTab);
  if (lastTab !== initialTab) {
    setLastTab(initialTab);
    setTab(initialTab);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div role="tablist" aria-label={p.tabsLabel} className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["projects", "tags"] as const).map((tabKey) => (
            <button
              key={tabKey}
              role="tab"
              aria-selected={tab === tabKey}
              onClick={() => setTab(tabKey)}
              className={
                tab === tabKey
                  ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }
            >
              {tabKey === "projects" ? p.projectsTab(arNum(projects.length, locale)) : p.tagsTab(arNum(tags.length, locale))}
            </button>
          ))}
        </div>
        {tab === "projects" ? (
          <Button size="sm" variant="primary" onClick={() => setShowNew(true)}>
            <Plus size={14} aria-hidden />
            {p.newProject}
          </Button>
        ) : null}
      </div>

      {tab === "projects" ? (
        projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={p.emptyTitle}
            description={p.emptyDesc}
            action={{ label: p.createProject, onClick: () => setShowNew(true) }}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((proj) => {
              const pct = proj.total > 0 ? Math.round((proj.done / proj.total) * 100) : 0;
              return (
                <li key={proj.id}>
                  <Link
                    href={`/projects/${proj.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProjectIcon icon={proj.icon} color={proj.color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{proj.name}</p>
                        <p className="truncate text-xs text-zinc-400">
                          {proj.description || p.noDescription}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="tnum tabular-nums">
                        {arNum(proj.done, locale)} / {arNum(proj.total, locale)} {p.doneSuffix}
                      </span>
                      <span className="tnum tabular-nums">{locale === "ar" ? `${arNum(pct, locale)}٪` : `${pct}%`}</span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${proj.name}`}
                    >
                      <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${pct}%` }} />
                    </div>
                    {proj.overdue > 0 ? (
                      <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                        {taskCountLabel(proj.overdue, locale)} {p.overdueWord}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <TagManager tags={tags} />
      )}

      <ProjectFormModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
