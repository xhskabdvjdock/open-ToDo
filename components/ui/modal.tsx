"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-provider";

/**
 * Minimal accessible modal dialog (single Lucide icon set, no emoji).
 * - role="dialog" aria-modal, labelled by title
 * - Esc closes, overlay click closes
 * - focus moves into the dialog on open and returns on close
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const { t } = useLocale();

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button:not([data-close])",
      );
      (el ?? panelRef.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "anim-pop-in flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl outline-none",
          "dark:border-zinc-800 dark:bg-zinc-900",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
          "sm:rounded-2xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label={t.common.closeDialog}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
