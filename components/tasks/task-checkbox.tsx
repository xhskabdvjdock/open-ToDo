"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskCheckbox({
  checked,
  pending,
  onToggle,
  label,
}: {
  checked: boolean;
  pending?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        "cursor-pointer disabled:cursor-wait disabled:opacity-60",
        checked
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-400 hover:border-zinc-700 dark:border-zinc-600 dark:hover:border-zinc-300",
      )}
    >
      {checked ? <Check size={13} strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}
