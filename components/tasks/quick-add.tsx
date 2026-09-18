"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/features/tasks/actions";
import { useLocale } from "@/components/locale-provider";

/**
 * Fast inline task creation: type a title, press Enter, done.
 * Extra details (priority, project, due date…) can be added afterwards
 * from the task row or the details panel.
 */
export function QuickAdd({
  projectId = null,
  dueDate,
  autoFocus,
}: {
  projectId?: string | null;
  dueDate?: string;
  autoFocus?: boolean;
}) {
  const { t } = useLocale();
  const tt = t.tasks;
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || saving) return;
    setSaving(true);
    const res = await createTask({ title: value, projectId, dueDate });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTitle("");
    toast.success(tt.added);
    inputRef.current?.focus();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
      >
        <Plus size={16} aria-hidden />
        {tt.addTask}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-900"
    >
      <label htmlFor="quick-add-input" className="sr-only">
        {tt.taskTitleLabel}
      </label>
      <input
        id="quick-add-input"
        ref={inputRef}
        value={title}
        autoFocus={autoFocus}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder={tt.quickPh}
        disabled={saving}
        maxLength={200}
        className="w-full bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      <div className="mt-1 flex items-center justify-between px-1 pb-1">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {saving ? t.common.saving : tt.quickHint}
        </p>
      </div>
    </form>
  );
}
