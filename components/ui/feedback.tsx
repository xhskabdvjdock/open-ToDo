import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Icon size={20} className="text-zinc-500 dark:text-zinc-400" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>
      {action ? (
        <Button variant="primary" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function ListSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  const initial = (name?.trim()?.[0] ?? email?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
    >
      {initial}
    </div>
  );
}
