"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/features/projects/actions";
import { taskCountLabel } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectFormModal, type ProjectFormValue } from "@/components/projects/project-form";

export function ProjectActions({ project }: { project: ProjectFormValue & { taskCount: number } }) {
  const { locale, t } = useLocale();
  const p = t.projects;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteProject({ id: project.id });
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setConfirm(false);
    toast.success(p.deletedMoved);
    router.push("/projects");
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden />
          {p.edit}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          <Trash2 size={14} aria-hidden />
          {p.delete}
        </Button>
      </div>
      <ProjectFormModal open={editing} onClose={() => setEditing(false)} initial={project} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleDelete}
        pending={deleting}
        title={p.deleteTitle}
        message={
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {project.taskCount > 0
              ? p.deleteWithTasks(project.name, taskCountLabel(project.taskCount, locale))
              : p.deleteEmpty(project.name)}
          </span>
        }
      />
    </>
  );
}
