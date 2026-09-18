// Timezone-aware date helpers.
//
// Due dates are stored in UTC. "Today", "Tomorrow", "Overdue" and "Upcoming"
// are always computed relative to the user's own IANA timezone (stored on the
// User record, editable in Settings). Nothing here uses a hard-coded date.
//
// All human-readable output follows the given locale ("ar" with
// Arabic-Indic digits, or "en").

import type { Locale } from "./i18n/locale";

function intl(locale: Locale): string {
  return locale === "ar" ? "ar" : "en";
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Format a number (Arabic-Indic digits for "ar", e.g. 12 -> "١٢"). */
export function arNum(n: number | string, locale: Locale): string {
  const value = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(value)) return locale === "ar" ? "٠" : "0";
  return new Intl.NumberFormat(intl(locale)).format(value);
}

/** Plural label for a task count in the given locale. */
export function taskCountLabel(n: number, locale: Locale): string {
  if (locale === "en") {
    if (n === 0) return "No tasks";
    if (n === 1) return "1 task";
    return `${new Intl.NumberFormat("en").format(n)} tasks`;
  }
  if (n === 0) return "لا مهام";
  if (n === 1) return "مهمة واحدة";
  if (n === 2) return "مهمتان";
  if (n <= 10) return `${arNum(n, locale)} مهام`;
  return `${arNum(n, locale)} مهمة`;
}

/** Offset in ms between UTC and `timeZone` at the given instant. */
function tzOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - instant.getTime();
}

/** Local calendar parts of an instant in `timeZone`. */
function localParts(timeZone: string, instant: Date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = dtf.format(instant).split("-").map(Number);
  return { y, m, d };
}

/**
 * UTC bounds [start, end) of the user's local day containing `ref`
 * (defaults to now).
 */
export function dayBounds(timeZone: string, ref: Date = new Date()): { start: Date; end: Date } {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const { y, m, d } = localParts(tz, ref);
  // First guess, then correct for DST by re-measuring at the candidate.
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMs(tz, new Date(guess));
    guess = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - off;
  }
  const start = new Date(guess);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Local date key "yyyy-MM-dd" of an instant in `timeZone`. */
export function toLocalDateKey(instant: Date, timeZone: string): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const { y, m, d } = localParts(tz, instant);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** Whole-calendar-day difference (dueDay - today) in the user's timezone. */
export function diffDaysFromToday(due: Date, timeZone: string, now: Date = new Date()): number {
  const a = toLocalDateKey(due, timeZone);
  const b = toLocalDateKey(now, timeZone);
  const ms = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) -
    Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

export type DueInfo = {
  kind: "none" | "overdue" | "today" | "tomorrow" | "this-week" | "later";
  label: string;
};

function overdueLabel(daysLate: number, locale: Locale): string {
  if (locale === "en") {
    if (daysLate <= 0) return "Overdue";
    if (daysLate === 1) return "Overdue since yesterday";
    return `Overdue by ${daysLate} days`;
  }
  if (daysLate <= 0) return "متأخرة";
  if (daysLate === 1) return "متأخرة منذ أمس";
  if (daysLate === 2) return "متأخرة منذ يومين";
  if (daysLate <= 10) return `متأخرة منذ ${arNum(daysLate, locale)} أيام`;
  return `متأخرة منذ ${arNum(daysLate, locale)} يومًا`;
}

export function describeDueDate(
  due: Date | null,
  timeZone: string,
  locale: Locale,
  now: Date = new Date(),
): DueInfo {
  if (!due) return { kind: "none", label: locale === "ar" ? "بدون تاريخ استحقاق" : "No due date" };
  const loc = intl(locale);
  const diff = diffDaysFromToday(due, timeZone, now);
  if (diff < 0) {
    return { kind: "overdue", label: overdueLabel(Math.abs(diff), locale) };
  }
  if (diff === 0) return { kind: "today", label: locale === "ar" ? "اليوم" : "Today" };
  if (diff === 1) return { kind: "tomorrow", label: locale === "ar" ? "غدًا" : "Tomorrow" };
  if (diff <= 7) {
    const weekday = new Intl.DateTimeFormat(loc, { timeZone, weekday: "long" }).format(due);
    return { kind: "this-week", label: weekday };
  }
  const label = new Intl.DateTimeFormat(loc, {
    timeZone,
    day: "numeric",
    month: "long",
  }).format(due);
  return { kind: "later", label };
}

export function isOverdue(due: Date | null, completed: boolean, timeZone: string, now: Date = new Date()): boolean {
  if (!due || completed) return false;
  return diffDaysFromToday(due, timeZone, now) < 0;
}

export function formatDateTime(instant: Date, timeZone: string, locale: Locale): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat(intl(locale), {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

export function formatDate(instant: Date, timeZone: string, locale: Locale): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat(intl(locale), {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}

/** Start of the upcoming window (tomorrow 00:00 -> +30 days) in user TZ. */
export function upcomingWindow(timeZone: string, now: Date = new Date()): { start: Date; end: Date } {
  const { end: tomorrow } = dayBounds(timeZone, now);
  return { start: tomorrow, end: new Date(tomorrow.getTime() + 30 * 86_400_000) };
}
