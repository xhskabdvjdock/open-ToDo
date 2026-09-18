"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTag, deleteTag, updateTag } from "@/features/projects/actions";
import { arNum, taskCountLabel } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type TagRow = { id: string; name: string; color: string; taskCount: number };

const TAG_COLORS = ["#64748b", "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function tagCountLabel(n: number, locale: "ar" | "en"): string {
  if (locale === "en") {
    if (n === 0) return "No tags";
    if (n === 1) return "1 tag";
    return `${n} tags`;
  }
  if (n === 1) return "وسم";
  if (n === 2) return "وسمان";
  return "وسوم";
}

export function TagManager({ tags }: { tags: TagRow[] }) {
  const { locale, t } = useLocale();
  const tg = t.tags;
  const [modal, setModal] = React.useState<null | { mode: "create" } | { mode: "edit"; tag: TagRow }>(null);
  const [confirm, setConfirm] = React.useState<TagRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    const res = await deleteTag({ id: confirm.id });
    setDeleting(false);
    setConfirm(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(tg.deleted);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tags.length === 0
            ? tg.noTags
            : tg.usage(`${arNum(tags.length, locale)} ${tagCountLabel(tags.length, locale)}`)}
        </p>
        <Button size="sm" variant="primary" onClick={() => setModal({ mode: "create" })}>
          <Plus size={14} aria-hidden />
          {tg.newTag}
        </Button>
      </div>

      {tags.length === 0 ? null : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {tags.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: row.color }}
              >
                #{row.name}
              </span>
              <span className="flex-1 text-xs text-zinc-400">
                {taskCountLabel(row.taskCount, locale)}
              </span>
              <button
                type="button"
                aria-label={tg.rename(row.name)}
                onClick={() => setModal({ mode: "edit", tag: row })}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Pencil size={14} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={tg.delete(row.name)}
                onClick={() => setConfirm(row)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? tg.renameTag : tg.newTag}
      >
        {modal ? (
          <TagFormInner
            key={modal.mode === "edit" ? modal.tag.id : "new"}
            initial={modal.mode === "edit" ? modal.tag : undefined}
            editing={modal.mode === "edit"}
            onClose={() => setModal(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        pending={deleting}
        title={tg.deleteTitle}
        message={
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {confirm ? tg.deleteMsg(confirm.name) : ""}
          </span>
        }
      />
    </div>
  );
}

function TagFormInner({
  initial,
  editing,
  onClose,
}: {
  initial?: TagRow;
  editing: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const tg = t.tags;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [color, setColor] = React.useState(initial?.color ?? TAG_COLORS[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = editing
      ? await updateTag({ id: initial!.id, name: name.trim(), color })
      : await createTag({ name: name.trim(), color });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(editing ? tg.updated : tg.created);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={tg.name} htmlFor="tag-name" hint={tg.nameHint} required>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tg.namePh}
          maxLength={30}
          required
        />
      </Field>
      <Field label={tg.color}>
        <div className="flex gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={t.projects.useColor(c)}
              aria-pressed={color === c}
              className={cn(
                "h-7 w-7 rounded-full",
                color === c ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900" : "",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>
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
          {saving ? t.common.saving : editing ? tg.save : tg.create}
        </Button>
      </div>
    </form>
  );
}
