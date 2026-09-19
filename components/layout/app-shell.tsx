"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { CheckSquare, X } from "lucide-react";
import { SidebarNav, type SidebarCounts, type SidebarProject } from "./sidebar-nav";
import { AppHeader } from "./app-header";
import { useLocale } from "@/components/locale-provider";
import { TaskUIProvider, useTaskUI, type ComposerDefaults } from "@/components/tasks/task-ui-context";
import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskDetailsPanel } from "@/components/tasks/task-details";

declare global {
  interface Window {
    __openTodoOpenCreate?: (defaults?: ComposerDefaults) => void;
  }
}

export function AppShell({
  children,
  user,
  timezone,
  counts,
  projects,
  tags,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; username?: string | null };
  timezone: string;
  counts: SidebarCounts;
  projects: SidebarProject[];
  tags: { id: string; name: string; color: string }[];
}) {
  const [drawer, setDrawer] = React.useState(false);
  const { t } = useLocale();

  // Global keyboard shortcuts: N = new task, / = search.
  // Physical key codes are used so shortcuts work with any keyboard layout.
  // Ignored while typing in inputs so they never conflict.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (e.key === "Escape") {
        setDrawer(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyN") {
        e.preventDefault();
        window.__openTodoOpenCreate?.();
      } else if (e.code === "Slash") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-global-search]")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TaskUIProvider projects={projects} tags={tags}>
      <ShortcutBridge />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        {t.skipLink}
      </a>
      <div className="flex h-dvh overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-e border-zinc-200 bg-zinc-50 lg:block dark:border-zinc-800 dark:bg-zinc-900/50">
          <Brand />
          <div className="h-[calc(100%-57px)]">
            <SidebarNav counts={counts} projects={projects} />
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawer ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="anim-fade-in absolute inset-0 bg-zinc-950/40" onClick={() => setDrawer(false)} aria-hidden />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t.nav.navigation}
              className="anim-slide-in-side absolute bottom-0 start-0 top-0 w-72 bg-zinc-50 shadow-xl dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between pe-2">
                <Brand />
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  aria-label={t.nav.closeNavigation}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
              <div className="h-[calc(100%-57px)]">
                <SidebarNav counts={counts} projects={projects} onNavigate={() => setDrawer(false)} />
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800" />}>
            <AppHeader user={user} onMenu={() => setDrawer(true)} />
          </Suspense>
          <main id="main-content" className="min-h-0 flex-1 overflow-y-auto" tabIndex={-1}>
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">{children}</div>
          </main>
        </div>
      </div>
      <TaskComposer timezone={timezone} />
      <TaskDetailsPanel timezone={timezone} />
    </TaskUIProvider>
  );
}

function Brand() {
  const { t } = useLocale();
  return (
    <Link href="/dashboard" className="flex h-[57px] items-center gap-2 px-5" aria-label={t.brandHome}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <CheckSquare size={16} aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">{t.brand}</span>
    </Link>
  );
}

/** Exposes openCreate to the global shortcut handler. */
function ShortcutBridge() {
  const { openCreate } = useTaskUI();
  React.useEffect(() => {
    window.__openTodoOpenCreate = openCreate;
    return () => {
      window.__openTodoOpenCreate = undefined;
    };
  }, [openCreate]);
  return null;
}
