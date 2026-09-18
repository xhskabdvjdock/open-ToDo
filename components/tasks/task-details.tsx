"use client";

import * as React from "react";
import { Activity, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, getTaskDetails, restoreTask, toggleTask, type DeletedTaskSnapshot } from "@/features/tasks/actions";
import { describeDueDate, formatDateTime } from "@/lib/dates";
import { Badge, priorityBadge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/feedback";
import { useLocale } from "@/components/locale-provider";
import { TaskCheckbox } from "./task-checkbox";
import { useTaskUI } from "./task-ui-context";

type Details = NonNullable<Awaited<ReturnType<typeof getTaskDetails>>["data"]>;

/**
 * Side detail panel for a task: full metadata, tags, activity timeline
 * (all real data), plus complete / edit / delete actions.
 * On mobile it renders as a bottom sheet.
 */
export function TaskDetailsPanel({ timezone }: { timezone: string }) {
  const { t } = useLocale();
  const { detailsId, closeOverlays } = useTaskUI();

  React.useEffect(() => {
    if (!detailsId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlays();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailsId, closeOverlays]);

  if (!detailsId) return null;

  return (
    <>
      <div
        className="anim-fade-in fixed inset-0 z-40 bg-zinc-950/40"
        onClick={closeOverlays}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.details.title}
        className="anim-slide-in-side fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:inset-x-auto sm:bottom-0 sm:end-0 sm:top-0 sm:w-[420px] sm:rounded-none sm:border-y-0 sm:border-e-0"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.details.title}</h2>
          <button
            type="button"
            onClick={closeOverlays}
            aria-label={t.details.close}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <DetailsBody key={detailsId} taskId={detailsId} timezone={timezone} />
      </aside>
    </>
  );
}

function DetailsBody({ taskId, timezone }: { taskId: string; timezone: string }) {
  const { locale, t } = useLocale();
  const d = t.details;
  const { closeOverlays, openEdit } = useTaskUI();
  const [task, setTask] = React.useState<Details | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const ACTION_LABEL: Record<string, string> = {
    CREATED: d.actionCreated,
    UPDATED: d.actionUpdated,
    COMPLETED: d.actionCompleted,
    REOPENED: d.actionReopened,
  };

  // Fresh fetch on mount (keyed by task id). Updates land in the callback.
  React.useEffect(() => {
    let cancelled = false;
    getTaskDetails({ id: taskId }).then((res) => {
      if (cancelled) return;
      if (!res.ok) setError(res.error);
      else setTask(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function refresh() {
    const fresh = await getTaskDetails({ id: taskId });
    if (fresh.ok) setTask(fresh.data);
  }

  async function handleToggle() {
    if (!task || busy) return;
    setBusy(true);
    const res = await toggleTask({ id: task.id });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.data.completed ? t.tasks.completedToast : t.tasks.reopenedToast);
    await refresh();
  }

  async function handleDelete() {
    if (!task) return;
    setBusy(true);
    const res = await deleteTask({ id: task.id });
    setBusy(false);
    setConfirmDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const snapshot: DeletedTaskSnapshot = res.data.snapshot;
    closeOverlays();
    toast.success(t.tasks.deletedToast, {
      action: {
        label: t.tasks.undo,
        onClick: async () => {
          const r = await restoreTask({ id: snapshot.id, snapshot });
          if (r.ok) toast.success(t.tasks.restoredToast);
          else toast.error(r.error);
        },
      },
      duration: 8000,
    });
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" role="status" aria-label={d.loadingDetails}>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <span className="sr-only">{t.common.loading}</span>
      </div>
    );
  }

  const done = task.status === "COMPLETED";
  const status = statusBadge(t, task.status);
  const priority = priorityBadge(t, task.priority);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5">
          <div className="flex items-start gap-2.5">
            <TaskCheckbox
              checked={done}
              pending={busy}
              onToggle={handleToggle}
              label={done ? t.tasks.reopen(task.title) : t.tasks.complete(task.title)}
            />
            <h3
              className={`text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 ${done ? "task-title-done text-zinc-500 dark:text-zinc-500" : ""}`}
            >
              {task.title}
            </h3>
          </div>

          {task.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {task.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.status}</dt>
              <dd className="mt-0.5">
                <Badge color={status.color}>{status.label}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.priority}</dt>
              <dd className="mt-0.5">
                <Badge color={priority.color}>{priority.label}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.dueDate}</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                {task.dueDate ? describeDueDate(task.dueDate, timezone, locale).label : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.project}</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                {task.project ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.project.color }}
                    />
                    {task.project.name}
                  </span>
                ) : (
                  d.inbox
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.created}</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                {formatDateTime(task.createdAt, timezone, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">{d.updated}</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                {formatDateTime(task.updatedAt, timezone, locale)}
              </dd>
            </div>
          </dl>

          {task.tags.length > 0 ? (
            <div>
              <h4 className="mb-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{d.tags}</h4>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tg) => (
                  <span
                    key={tg.tagId}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: tg.tag.color }}
                  >
                    #{tg.tag.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
              <Activity size={14} aria-hidden />
              {d.activity}
            </h4>
            {task.activities.length === 0 ? (
              <p className="text-[13px] text-zinc-400">{d.noActivity}</p>
            ) : (
              <ol className="space-y-2.5 border-s border-zinc-200 ps-3 dark:border-zinc-800">
                {task.activities.map((a) => (
                  <li key={a.id} className="text-[13px]">
                    <p className="font-medium text-zinc-700 dark:text-zinc-200">
                      {ACTION_LABEL[a.action] ?? a.action}
                    </p>
                    {a.detail ? (
                      <p className="text-zinc-500 dark:text-zinc-400">{a.detail}</p>
                    ) : null}
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(a.createdAt, timezone, locale)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <Button variant="ghost" size="sm" onClick={() => openEdit(task.id)}>
          <Pencil size={14} aria-hidden />
          {d.edit}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={14} aria-hidden />
          {d.delete}
        </Button>
        <Button variant="primary" size="sm" onClick={handleToggle} disabled={busy}>
          {done ? d.reopen : d.complete}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        pending={busy}
        title={t.tasks.deleteTitle}
        message={
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {t.tasks.deleteMsg(task.title)}
          </span>
        }
      />
    </>
  );
}
