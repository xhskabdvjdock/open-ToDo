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

  async function persistOrder(movedId: string, predecessorId: string | null, successorId: string | null) {
    setBusy(true);
    // predecessor = item that stays right before, successor = right after.
    const res = await reorderTask({ id: movedId, beforeId: predecessorId, afterId: successorId });
    setBusy(false);
    if (!res.ok) toast.error(res.error);
  }

  /** Drop onto a row inserts the dragged task right before that row. */
  function handleDropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const without = tasks.map((t) => t.id).filter((id) => id !== dragId);
    const insertIdx = without.indexOf(targetId);
    if (insertIdx === -1) {
      setDragId(null);
      return;
    }
    const predecessor = without[insertIdx - 1] ?? null;
    const moved = dragId;
    setDragId(null);
    void persistOrder(moved, predecessor, targetId);
  }

  /** Arrow buttons move the task one position (same persisted order). */
  function handleMove(id: string, direction: -1 | 1) {
    const idx = tasks.findIndex((t) => t.id === id);
    const newIdx = idx + direction;
    if (idx === -1 || newIdx < 0 || newIdx >= tasks.length) return;
    const without = tasks.map((t) => t.id).filter((x) => x !== id);
    // In the list without the moved item, it lands at newIdx.
    const predecessor = without[newIdx - 1] ?? null;
    const successor = without[newIdx] ?? null;
    void persistOrder(id, predecessor, successor);
  }

  return (
    <ul className="space-y-2" aria-label={t.tasks.listLabel}>
      {tasks.map((task) => (
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
