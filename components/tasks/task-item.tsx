"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CalendarDays, GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/features/tasks/actions";
import { deleteTask, restoreTask, toggleTask, type DeletedTaskSnapshot } from "@/features/tasks/actions";
import { arNum, describeDueDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge, priorityBadge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { TaskCheckbox } from "./task-checkbox";
import { useTaskUI } from "./task-ui-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function DueLabel({ task, timezone }: { task: TaskWithRelations; timezone: string }) {
  const { locale } = useLocale();
  const info = describeDueDate(task.dueDate, timezone, locale);
  if (info.kind === "none") return null;
  const completed = task.status === "COMPLETED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        !completed && info.kind === "overdue"
          ? "font-medium text-red-600 dark:text-red-400"
          : "text-zinc-500 dark:text-zinc-400",
      )}
    >
      <CalendarDays size={13} aria-hidden />
      {info.label}
    </span>
  );
}

export function TaskItem({
  task,
  timezone,
  draggable,
  onDragStart,
  onDropOn,
  isDragging,
  onMove,
  moveDisabled,
}: {
  task: TaskWithRelations;
  timezone: string;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDropOn?: (id: string) => void;
  isDragging?: boolean;
  onMove?: (id: string, direction: -1 | 1) => void;
  moveDisabled?: boolean;
}) {
  const { locale, t } = useLocale();
  const tt = t.tasks;
  const { openDetails, openEdit } = useTaskUI();
  const completed = task.status === "COMPLETED";
  const [pending, setPending] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Optimistic completion, resynced when fresh server data arrives
  // (adjusting state during render keeps refresh correctness).
  const [lastSyncedStatus, setLastSyncedStatus] = React.useState(task.status);
  const [optimisticDone, setOptimisticDone] = React.useState(completed);
  if (lastSyncedStatus !== task.status) {
    setLastSyncedStatus(task.status);
    setOptimisticDone(task.status === "COMPLETED");
  }

  async function handleToggle() {
    if (pending) return;
    const next = !optimisticDone;
    setOptimisticDone(next); // optimistic update
    setPending(true);
    const res = await toggleTask({ id: task.id });
    setPending(false);
    if (!res.ok) {
      setOptimisticDone(!next); // rollback on failure
      toast.error(res.error);
    } else {
      toast.success(next ? tt.completedToast : tt.reopenedToast);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteTask({ id: task.id });
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const snapshot: DeletedTaskSnapshot = res.data.snapshot;
    toast.success(tt.deletedToast, {
      action: {
        label: tt.undo,
        onClick: async () => {
          const r = await restoreTask({ id: snapshot.id, snapshot });
          if (r.ok) toast.success(tt.restoredToast);
          else toast.error(r.error);
        },
      },
      duration: 8000,
    });
  }

  const priority = priorityBadge(t, task.priority);

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={draggable ? () => onDragStart?.(task.id) : undefined}
        onDragOver={draggable ? (e) => e.preventDefault() : undefined}
        onDrop={draggable ? () => onDropOn?.(task.id) : undefined}
        onClick={() => openDetails(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) openDetails(task.id);
        }}
        tabIndex={0}
        role="button"
        aria-label={tt.openDetails(task.title)}
        className={cn(
          "group flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5",
          "transition-colors hover:border-zinc-300 hover:bg-zinc-50",
          "dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
          isDragging && "opacity-40",
          optimisticDone && "opacity-75",
        )}
      >
        {draggable ? (
          <span
            className="mt-1 hidden cursor-grab text-zinc-300 group-hover:block dark:text-zinc-600"
            aria-hidden
            title={tt.dragHint}
          >
            <GripVertical size={15} />
          </span>
        ) : null}
        <TaskCheckbox
          checked={optimisticDone}
          pending={pending}
          onToggle={handleToggle}
          label={optimisticDone ? tt.reopen(task.title) : tt.complete(task.title)}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm text-zinc-900 dark:text-zinc-100",
              optimisticDone && "task-title-done text-zinc-500 dark:text-zinc-500",
            )}
          >
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {task.project ? (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.project.color }}
                />
                {task.project.name}
              </span>
            ) : null}
            <DueLabel task={task} timezone={timezone} />
            {task.priority !== "MEDIUM" || task.status === "IN_PROGRESS" ? (
              <Badge color={priority.color}>{priority.label}</Badge>
            ) : null}
            {task.status === "IN_PROGRESS" ? (
              <Badge color="blue">{tt.inProgress}</Badge>
            ) : null}
            {task.tags.slice(0, 3).map((tg) => (
              <span key={tg.tagId} className="text-xs text-zinc-400 dark:text-zinc-500">
                #{tg.tag.name}
              </span>
            ))}
            {task.tags.length > 3 ? (
              <span className="tnum text-xs text-zinc-400">+{arNum(task.tags.length - 3, locale)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onMove ? (
            <>
              <button
                type="button"
                aria-label={tt.moveUp(task.title)}
                disabled={moveDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task.id, -1);
                }}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ArrowUp size={15} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={tt.moveDown(task.title)}
                disabled={moveDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task.id, 1);
                }}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ArrowDown size={15} aria-hidden />
              </button>
            </>
          ) : null}
          <button
            type="button"
            aria-label={tt.editTask(task.title)}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(task.id);
            }}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Pencil size={15} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={tt.deleteTask(task.title)}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        pending={deleting}
        title={tt.deleteTitle}
        message={
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {tt.deleteMsg(task.title)}
          </span>
        }
      />
    </>
  );
}
