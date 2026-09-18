"use client";

import * as React from "react";
import { ListTodo } from "lucide-react";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/features/tasks/actions";
import { reorderTask } from "@/features/tasks/actions";
import { useLocale } from "@/components/locale-provider";
import { TaskItem } from "./task-item";
import { EmptyState } from "@/components/ui/feedback";

export function TaskList({
  tasks,
  timezone,
  reorderable,
  empty,
}: {
  tasks: TaskWithRelations[];
  timezone: string;
  reorderable?: boolean;
  empty?: { title: string; description: string; actionLabel?: string; onAction?: () => void };
}) {
  const { t } = useLocale();
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Optimistic ordering: moves render instantly, the server confirms in the
  // background, and fresh server data always wins (render-time resync).
  const [orderOverride, setOrderOverride] = React.useState<string[] | null>(null);
  const [syncedKey, setSyncedKey] = React.useState(() => orderKey(tasks));
  const currentKey = orderKey(tasks);
  if (syncedKey !== currentKey) {
    setSyncedKey(currentKey);
    setOrderOverride(null);
  }

  const visible = React.useMemo(() => {
    if (!orderOverride) return tasks;
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const ordered = orderOverride.map((id) => byId.get(id)).filter((x) => x !== undefined);
    // Any new server tasks not in the override are appended.
    for (const task of tasks) {
      if (!orderOverride.includes(task.id)) ordered.push(task);
    }
    return ordered;
  }, [tasks, orderOverride]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title={empty?.title ?? t.tasks.noTasksYet}
        description={empty?.description ?? t.tasks.createFirst}
        action={
          empty?.actionLabel && empty?.onAction
            ? { label: empty.actionLabel, onClick: empty.onAction }
            : undefined
        }
      />
    );
  }

  async function persistOrder(movedId: string, predecessorId: string | null, successorId: string | null, optimisticIds: string[]) {
    setOrderOverride(optimisticIds);
    setBusy(true);
    // predecessor = item that stays right before, successor = right after.
    const res = await reorderTask({ id: movedId, beforeId: predecessorId, afterId: successorId });
    setBusy(false);
    if (!res.ok) {
      setOrderOverride(null); // rollback to server order
      toast.error(res.error);
    }
  }

  /** Drop onto a row inserts the dragged task right before that row. */
  function handleDropOn(targetId: string) {
    if (busy || !dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = visible.map((task) => task.id);
    const without = ids.filter((id) => id !== dragId);
    const insertIdx = without.indexOf(targetId);
    if (insertIdx === -1) {
      setDragId(null);
      return;
    }
    const predecessor = without[insertIdx - 1] ?? null;
    const moved = dragId;
    const optimisticIds = [...without.slice(0, insertIdx), moved, ...without.slice(insertIdx)];
    setDragId(null);
    void persistOrder(moved, predecessor, targetId, optimisticIds);
  }

  /** Arrow buttons move the task one position (same persisted order). */
  function handleMove(id: string, direction: -1 | 1) {
    if (busy) return;
    const ids = visible.map((task) => task.id);
    const idx = ids.indexOf(id);
    const newIdx = idx + direction;
    if (idx === -1 || newIdx < 0 || newIdx >= ids.length) return;
    const without = ids.filter((x) => x !== id);
    // In the list without the moved item, it lands at newIdx.
    const predecessor = without[newIdx - 1] ?? null;
    const successor = without[newIdx] ?? null;
    const optimisticIds = [...without.slice(0, newIdx), id, ...without.slice(newIdx)];
    void persistOrder(id, predecessor, successor, optimisticIds);
  }

  return (
    <ul className="space-y-2" aria-label={t.tasks.listLabel}>
      {visible.map((task) => (
        <li key={task.id}>
          <TaskItem
            task={task}
            timezone={timezone}
            draggable={reorderable}
            isDragging={dragId === task.id}
            onDragStart={setDragId}
            onDropOn={handleDropOn}
            onMove={reorderable ? handleMove : undefined}
            moveDisabled={busy}
          />
        </li>
      ))}
    </ul>
  );
}

function orderKey(tasks: TaskWithRelations[]): string {
  return tasks.map((t) => `${t.id}:${t.order}:${t.status}:${t.updatedAt}`).join("|");
}
