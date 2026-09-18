import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, FolderKanban, ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/current-user";
import { getDict } from "@/lib/i18n/server";
import { arNum, dayBounds, describeDueDate } from "@/lib/dates";
import { PageHeader } from "@/components/tasks/page-header";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pages.dashboardTitle };
}

function SectionLink({ href, label, rtl }: { href: string; label: string; rtl: boolean }) {
  const Icon = rtl ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {label}
      <Icon size={14} aria-hidden />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();
  const { locale, t } = await getDict();
  const p = t.pages;
  const rtl = locale === "ar";
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBounds(user.timezone, now);
  const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);

  const [todayTasks, overdueTasks, upcomingTasks, completedThisWeek, totals, projects] =
    await Promise.all([
      db.task.findMany({
        where: {
          userId: user.id,
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          dueDate: { gte: todayStart, lt: todayEnd },
        },
        include: { project: true, tags: { include: { tag: true } } },
        orderBy: { order: "asc" },
        take: 50,
      }),
      db.task.findMany({
        where: {
          userId: user.id,
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          dueDate: { lt: todayStart },
        },
        include: { project: true, tags: { include: { tag: true } } },
        orderBy: [{ dueDate: "asc" }, { order: "asc" }],
        take: 50,
      }),
      db.task.findMany({
        where: {
          userId: user.id,
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          dueDate: { gte: todayEnd },
        },
        include: { project: true, tags: { include: { tag: true } } },
        orderBy: [{ dueDate: "asc" }, { order: "asc" }],
        take: 5,
      }),
      db.task.count({
        where: { userId: user.id, status: "COMPLETED", completedAt: { gte: weekStart } },
      }),
      db.task.groupBy({
        by: ["status"],
        where: { userId: user.id, status: { not: "ARCHIVED" } },
        _count: { status: true },
      }),
      db.project.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: 6,
        include: {
          _count: {
            select: {
              tasks: { where: { status: { not: "ARCHIVED" } } },
            },
          },
          tasks: {
            where: { status: "COMPLETED" },
            select: { id: true },
          },
        },
      }),
    ]);

  const totalActive = totals.reduce((n, g) => n + g._count.status, 0);
  const completedTotal = totals.find((g) => g.status === "COMPLETED")?._count.status ?? 0;
  const completionRate = totalActive > 0 ? Math.round((completedTotal / totalActive) * 100) : null;

  const firstName = user.name?.split(" ")[0];
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, hour: "numeric", hour12: false }).format(now),
  );
  const greeting = hour < 12 ? p.morning : p.evening;

  const stats = [
    { icon: CalendarDays, label: p.statToday, value: arNum(todayTasks.length, locale) },
    { icon: CircleAlert, label: p.statOverdue, value: arNum(overdueTasks.length, locale) },
    { icon: ListChecks, label: p.statWeek, value: arNum(completedThisWeek, locale) },
    {
      icon: FolderKanban,
      label: p.statRate,
      value: completionRate === null ? "—" : locale === "ar" ? `${arNum(completionRate, locale)}٪` : `${completionRate}%`,
    },
  ];

  return (
    <div>
      <PageHeader
        title={firstName ? p.helloName(greeting, firstName) : p.hello(greeting)}
        description={
          overdueTasks.length > 0
            ? p.dashDescBoth(arNum(overdueTasks.length, locale), arNum(todayTasks.length, locale))
            : todayTasks.length > 0
              ? p.dashDescToday(arNum(todayTasks.length, locale))
              : p.dashDescCalm
        }
      />

      <dl className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <dt className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Icon size={13} aria-hidden />
              {label}
            </dt>
            <dd className="tnum mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {overdueTasks.length > 0 ? (
        <section aria-label={p.overdueSection} className="mb-7">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              {p.overdueSection} · {arNum(overdueTasks.length, locale)}
            </h2>
            <SectionLink href="/today" label={p.review} rtl={rtl} />
          </div>
          <TaskList tasks={overdueTasks.slice(0, 5)} timezone={user.timezone} />
        </section>
      ) : null}

      <section aria-label={p.todaySection} className="mb-7">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {p.todaySection} · {arNum(todayTasks.length, locale)}
          </h2>
          <SectionLink href="/today" label={p.openToday} rtl={rtl} />
        </div>
        <div className="space-y-2">
          <TaskList
            tasks={todayTasks}
            timezone={user.timezone}
            empty={{ title: p.noDueToday, description: p.addBelowToday }}
          />
          <QuickAdd dueDate={new Date(todayStart.getTime()).toISOString().slice(0, 10)} />
        </div>
      </section>

      <section aria-label={p.upNext} className="mb-7">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.upNext}</h2>
          <SectionLink href="/upcoming" label={p.openUpcoming} rtl={rtl} />
        </div>
        {upcomingTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-[13px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {p.nothingAhead}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {upcomingTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 px-3.5 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
                  {task.title}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {describeDueDate(task.dueDate, user.timezone, locale).label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={p.projectsSection}>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.projectsSection}</h2>
          <SectionLink href="/projects" label={t.nav.allProjects} rtl={rtl} />
        </div>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-[13px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {p.noProjectsCta}{" "}
            <Link href="/projects" className="font-medium underline underline-offset-2">
              {p.projectsPageLink}
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {projects.map((proj) => {
              const total = proj._count.tasks;
              const done = proj.tasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <li key={proj.id}>
                  <Link
                    href={`/projects/${proj.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-3.5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-[4px]"
                        style={{ backgroundColor: proj.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{proj.name}</span>
                      <span className="tnum text-xs tabular-nums text-zinc-400">
                        {arNum(done, locale)} / {arNum(total, locale)}
                      </span>
                    </div>
                    <div
                      className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={proj.name}
                    >
                      <div
                        className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
