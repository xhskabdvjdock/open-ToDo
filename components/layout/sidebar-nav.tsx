"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Folder,
  Inbox,
  Settings,
  Tags,
} from "lucide-react";
import { arNum, taskCountLabel } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export type SidebarProject = {
  id: string;
  name: string;
  color: string;
  activeCount: number;
};

export type SidebarCounts = {
  inbox: number;
  today: number;
  upcoming: number;
  completed: number;
};

function CountBadge({ count, locale }: { count: number; locale: "ar" | "en" }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={taskCountLabel(count, locale)}
      className="tnum rounded-full bg-zinc-300/60 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
    >
      {count > 99 ? (locale === "ar" ? "٩٩+" : "99+") : arNum(count, locale)}
    </span>
  );
}

export function SidebarNav({
  counts,
  projects,
  onNavigate,
}: {
  counts: SidebarCounts;
  projects: SidebarProject[];
  onNavigate?: () => void;
}) {
  const { locale, t } = useLocale();
  const n = t.nav;
  const pathname = usePathname();

  const MAIN_LINKS = [
    { href: "/inbox", label: n.inbox, icon: Inbox, key: "inbox" as const },
    { href: "/today", label: n.today, icon: CalendarDays, key: "today" as const },
    { href: "/upcoming", label: n.upcoming, icon: CalendarRange, key: "upcoming" as const },
    { href: "/completed", label: n.completed, icon: CheckCircle2, key: "completed" as const },
  ];

  function isActive(href: string) {
    return pathname === href || (href !== "/inbox" && pathname.startsWith(href + "/"));
  }

  return (
    <nav aria-label={n.label} className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      {MAIN_LINKS.map(({ href, label, icon: Icon, key }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200",
            )}
          >
            <Icon size={17} aria-hidden className="shrink-0" />
            <span className="flex-1">{label}</span>
            <CountBadge count={counts[key]} locale={locale} />
          </Link>
        );
      })}

      <div className="mt-5 flex items-center justify-between px-3">
        <Link
          href="/projects"
          onClick={onNavigate}
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            pathname.startsWith("/projects")
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300",
          )}
        >
          {n.projects}
        </Link>
        <span className="tnum text-[11px] text-zinc-400 dark:text-zinc-600">{arNum(projects.length, locale)}</span>
      </div>
      {projects.length === 0 ? (
        <p className="px-3 py-1.5 text-[13px] text-zinc-400 dark:text-zinc-500">
          {n.noProjects}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {projects.slice(0, 20).map((p) => {
            const href = `/projects/${p.id}`;
            const active = pathname === href;
            return (
              <li key={p.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.activeCount > 0 ? (
                    <span className="tnum text-[11px] text-zinc-400 dark:text-zinc-500">
                      {arNum(p.activeCount, locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 space-y-0.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Link
          href="/projects?tab=tags"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
        >
          <Tags size={17} aria-hidden className="shrink-0" />
          {n.tags}
        </Link>
        <Link
          href="/projects"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
        >
          <Folder size={17} aria-hidden className="shrink-0" />
          {n.allProjects}
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === "/settings"
              ? "bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200",
          )}
        >
          <Settings size={17} aria-hidden className="shrink-0" />
          {n.settings}
        </Link>
      </div>
    </nav>
  );
}
