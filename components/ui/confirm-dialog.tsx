"use client";

import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { useLocale } from "@/components/locale-provider";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending} autoFocus>
          {pending ? t.common.working : (confirmLabel ?? t.common.delete)}
        </Button>
      </div>
    </Modal>
  );
}
