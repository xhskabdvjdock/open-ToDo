"use client";

import * as React from "react";
import type { Tag } from "@prisma/client";

export type ComposerDefaults = {
  projectId?: string | null;
  dueDate?: string; // yyyy-MM-dd
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
};

type ComposerState =
  | { mode: "create"; defaults?: ComposerDefaults }
  | { mode: "edit"; taskId: string }
  | null;

type TaskUI = {
  composer: ComposerState;
  detailsId: string | null;
  projects: { id: string; name: string; color: string }[];
  tags: Pick<Tag, "id" | "name" | "color">[];
  openCreate: (defaults?: ComposerDefaults) => void;
  openEdit: (taskId: string) => void;
  openDetails: (taskId: string) => void;
  closeOverlays: () => void;
};

const Ctx = React.createContext<TaskUI | null>(null);

export function TaskUIProvider({
  children,
  projects,
  tags,
}: {
  children: React.ReactNode;
  projects: TaskUI["projects"];
  tags: TaskUI["tags"];
}) {
  const [composer, setComposer] = React.useState<ComposerState>(null);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);

  const value = React.useMemo<TaskUI>(
    () => ({
      composer,
      detailsId,
      projects,
      tags,
      openCreate: (defaults) => {
        setDetailsId(null);
        setComposer({ mode: "create", defaults });
      },
      openEdit: (taskId) => {
        setDetailsId(null);
        setComposer({ mode: "edit", taskId });
      },
      openDetails: (taskId) => {
        setComposer(null);
        setDetailsId(taskId);
      },
      closeOverlays: () => {
        setComposer(null);
        setDetailsId(null);
      },
    }),
    [composer, detailsId, projects, tags],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskUI(): TaskUI {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTaskUI must be used inside TaskUIProvider");
  return ctx;
}
