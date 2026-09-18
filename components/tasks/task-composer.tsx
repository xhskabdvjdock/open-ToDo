"use client";

import * as React from "react";
import { toast } from "sonner";
import { createTask, getTaskDetails, updateTask } from "@/features/tasks/actions";
import { toDateInputValue } from "@/lib/date-input";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useLocale } from "@/components/locale-provider";
import { useTaskUI, type ComposerDefaults } from "./task-ui-context";

type ProjectOpt = { id: string; name: string };
type TagOpt = { id: string; name: string; color: string };

/**
 * Full task composer used for both creating and editing.
 * Mounted once in the app shell; opened via useTaskUI().
 * The inner form is keyed so it always initializes fresh — no reset effects.
 */
export function TaskComposer({ timezone }: { timezone: string }) {
  const { t } = useLocale();
  const { composer, closeOverlays, projects, tags } = useTaskUI();
  const open = composer !== null;
  const mode = composer?.mode ?? "create";

  return (
    <Modal
      open={open}
      onClose={closeOverlays}
      title={mode === "create" ? t.composer.newTask : t.composer.editTask}
      wide
    >
      {composer?.mode === "edit" ? (
        <EditForm
          key={composer.taskId}
          taskId={composer.taskId}
          timezone={timezone}
          projects={projects}
          tags={tags}
          onDone={closeOverlays}
        />
      ) : composer ? (
        <TaskForm
          key={`create-${JSON.stringify(composer.defaults ?? {})}`}
          initial={{
            title: "",
            description: "",
            status: "TODO",
            priority: composer.defaults?.priority ?? "MEDIUM",
            dueDate: composer.defaults?.dueDate ?? "",
            projectId: composer.defaults?.projectId ?? "",
            tagIds: [],
          }}
          projects={projects}
          tags={tags}
          submitLabel={t.composer.create}
          successMessage={t.composer.created}
          onSubmit={(p) => createTask(p)}
          onDone={closeOverlays}
        />
      ) : null}
    </Modal>
  );
}

type FormInitial = {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  projectId: string;
  tagIds: string[];
};

function EditForm({
  taskId,
  timezone,
  projects,
  tags,
  onDone,
}: {
  taskId: string;
  timezone: string;
  projects: ProjectOpt[];
  tags: TagOpt[];
  onDone: () => void;
}) {
  const { t } = useLocale();
  // Async load only — state updates happen in the promise callback.
  const [loaded, setLoaded] = React.useState<FormInitial | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getTaskDetails({ id: taskId }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      const task = res.data;
      setLoaded({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? toDateInputValue(task.dueDate, timezone) : "",
        projectId: task.projectId ?? "",
        tagIds: task.tags.map((x) => x.tagId),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [taskId, timezone]);

  if (loadError) {
    return (
      <div className="py-6 text-center">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onDone}>
          {t.common.close}
        </Button>
      </div>
    );
  }
  if (!loaded) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500" role="status">
        {t.composer.loadingTask}
      </p>
    );
  }
  return (
    <TaskForm
      initial={loaded}
      projects={projects}
      tags={tags}
      submitLabel={t.composer.save}
      successMessage={t.composer.updated}
      onSubmit={(p) => updateTask({ ...p, id: taskId })}
      onDone={onDone}
    />
  );
}

function TaskForm({
  initial,
  projects,
  tags,
  submitLabel,
  successMessage,
  onSubmit,
  onDone,
}: {
  initial: FormInitial;
  projects: ProjectOpt[];
  tags: TagOpt[];
  submitLabel: string;
  successMessage: string;
  onSubmit: (p: {
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate: string | null;
    projectId: string | null;
    tagIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const c = t.composer;
  const [title, setTitle] = React.useState(initial.title);
  const [description, setDescription] = React.useState(initial.description);
  const [status, setStatus] = React.useState(initial.status);
  const [priority, setPriority] = React.useState(initial.priority);
  const [dueDate, setDueDate] = React.useState(initial.dueDate);
  const [projectId, setProjectId] = React.useState(initial.projectId);
  const [tagIds, setTagIds] = React.useState<string[]>(initial.tagIds);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const PRIORITIES = [
    { value: "LOW", label: t.filter.low },
    { value: "MEDIUM", label: t.filter.medium },
    { value: "HIGH", label: t.filter.high },
    { value: "URGENT", label: t.filter.urgent },
  ];
  const STATUSES = [
    { value: "TODO", label: t.filter.todo },
    { value: "IN_PROGRESS", label: t.filter.inProgress },
    { value: "COMPLETED", label: t.filter.completed },
    { value: "ARCHIVED", label: t.filter.archived },
  ];

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const res = await onSubmit({
      title: title.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
      status,
      priority,
      dueDate: dueDate === "" ? null : dueDate,
      projectId: projectId === "" ? null : projectId,
      tagIds,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? c.genericError);
      return;
    }
    toast.success(successMessage);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={c.title} htmlFor="composer-title" required>
        <Input
          id="composer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={c.titlePh}
          maxLength={200}
          required
        />
      </Field>

      <Field label={c.description} htmlFor="composer-desc" hint={c.descHint}>
        <Textarea
          id="composer-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={c.descPh}
          maxLength={2000}
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={c.status} htmlFor="composer-status">
          <Select id="composer-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={c.priority} htmlFor="composer-priority">
          <Select id="composer-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={c.dueDate} htmlFor="composer-due">
          <Input id="composer-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label={c.project} htmlFor="composer-project">
          <Select id="composer-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{c.inboxNone}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {tags.length > 0 ? (
        <fieldset>
          <legend className="mb-1.5 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
            {c.tags}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tg) => {
              const active = tagIds.includes(tg.id);
              return (
                <button
                  key={tg.id}
                  type="button"
                  onClick={() => toggleTag(tg.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }
                  style={active ? { backgroundColor: tg.color } : undefined}
                >
                  #{tg.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone} disabled={loading}>
          {t.common.cancel}
        </Button>
        <Button variant="primary" type="submit" disabled={loading || title.trim() === ""}>
          {loading ? t.common.saving : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export type { ComposerDefaults };
