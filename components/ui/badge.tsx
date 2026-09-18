import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/ar";

const palette: Record<string, string> = {
  slate:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900",
  amber:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900",
  green:
    "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/60 dark:text-green-300 dark:ring-green-900",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-900",
};

export function Badge({
  color = "slate",
  className,
  children,
}: {
  color?: keyof typeof palette;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        palette[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

type BadgeColor = "red" | "amber" | "blue" | "slate";

export function priorityBadge(t: Dict, key: string): { color: BadgeColor; label: string } {
  const map: Record<string, { color: BadgeColor; label: keyof Dict["priority"] }> = {
    URGENT: { color: "red", label: "URGENT" },
    HIGH: { color: "amber", label: "HIGH" },
    MEDIUM: { color: "blue", label: "MEDIUM" },
    LOW: { color: "slate", label: "LOW" },
  };
  const entry = map[key] ?? map.MEDIUM;
  return { color: entry.color, label: t.priority[entry.label] };
}

type StatusColor = "slate" | "blue" | "green" | "violet";

export function statusBadge(t: Dict, key: string): { color: StatusColor; label: string } {
  const map: Record<string, { color: StatusColor; label: keyof Dict["status"] }> = {
    TODO: { color: "slate", label: "TODO" },
    IN_PROGRESS: { color: "blue", label: "IN_PROGRESS" },
    COMPLETED: { color: "green", label: "COMPLETED" },
    ARCHIVED: { color: "violet", label: "ARCHIVED" },
  };
  const entry = map[key] ?? map.TODO;
  return { color: entry.color, label: t.status[entry.label] };
}
