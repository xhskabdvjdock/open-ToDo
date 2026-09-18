"use client";

import * as React from "react";
import { toast } from "sonner";
import { createProject, updateProject } from "@/features/projects/actions";
import { PROJECT_ICONS } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useLocale } from "@/components/locale-provider";
import { ProjectIcon, PROJECT_ICON_MAP, projectIconLabel } from "./project-icon";

const COLOR_PRESETS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export type ProjectFormValue = {
  id?: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
};

export function ProjectFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ProjectFormValue | null;
}) {
  const { t } = useLocale();
  const editing = !!initial?.id;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t.projects.editProject : t.projects.newProject}
      description={editing ? t.projects.editDesc : t.projects.newDesc}
    >
      {open ? (
        <ProjectFormInner
          key={initial?.id ?? "new"}
          initial={initial}
          editing={editing}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function ProjectFormInner({
  initial,
  editing,
  onClose,
}: {
  initial?: ProjectFormValue | null;
  editing: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useLocale();
  const p = t.projects;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [color, setColor] = React.useState(initial?.color ?? COLOR_PRESETS[0]);
  const [icon, setIcon] = React.useState(initial?.icon ?? "folder");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
      color,
      icon,
    };
    const res = editing
      ? await updateProject({ ...payload, id: initial!.id })
      : await createProject(payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(editing ? p.updated : p.created);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={p.name} htmlFor="project-name" required>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={p.namePh}
          maxLength={60}
          required
        />
      </Field>
      <Field label={p.description} htmlFor="project-desc">
        <Textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={p.descPh}
          maxLength={500}
          rows={2}
        />
      </Field>
      <div className="flex items-center gap-4">
        <Field label={p.icon}>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={p.iconLabel}>
            {PROJECT_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                role="radio"
                aria-checked={icon === iconName}
                aria-label={projectIconLabel(iconName, locale)}
                title={projectIconLabel(iconName, locale)}
                onClick={() => setIcon(iconName)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform",
                  icon === iconName
                    ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900"
                    : "opacity-70 hover:opacity-100",
                )}
                style={{ backgroundColor: color }}
              >
                <ProjectPreviewIcon name={iconName} />
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label={p.color} htmlFor="project-color">
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={p.useColor(c)}
              aria-pressed={color === c}
              className={cn(
                "h-7 w-7 rounded-full transition-transform",
                color === c ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900" : "",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            id="project-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label={p.customColor}
            className="h-7 w-10 cursor-pointer rounded bg-transparent"
          />
        </div>
      </Field>
      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
        <ProjectIcon icon={icon} color={color} />
        <span className="text-sm font-medium">{name.trim() === "" ? p.preview : name}</span>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {t.common.cancel}
        </Button>
        <Button variant="primary" type="submit" disabled={saving || name.trim() === ""}>
          {saving ? t.common.saving : editing ? t.composer.save : p.createProject}
        </Button>
      </div>
    </form>
  );
}

function ProjectPreviewIcon({ name }: { name: string }) {
  const Icon = PROJECT_ICON_MAP[name];
  return Icon ? <Icon size={15} aria-hidden /> : null;
}
