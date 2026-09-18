// Extra date helper: interpret user-entered date input in their timezone.

import { isValidTimeZone } from "./dates";

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

/**
 * Parse a client date input into a UTC Date, interpreting wall-clock time in
 * the user's timezone.
 *
 * Accepts:
 *  - "yyyy-MM-dd"            -> that day at 12:00 local (avoids TZ edge flips)
 *  - "yyyy-MM-ddTHH:mm"      -> that local wall time (datetime-local inputs)
 *  - full ISO with offset/Z  -> exact instant
 *
 * Returns null for empty input, or throws for invalid input.
 */
export function parseDateInputToUTC(value: string | null | undefined, timeZone: string): Date | null {
  if (value == null || value.trim() === "") return null;
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const v = value.trim();

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (dateOnly) {
    const y = +dateOnly[1];
    const m = +dateOnly[2];
    const d = +dateOnly[3];
    if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error("INVALID_DATE");
    let guess = Date.UTC(y, m - 1, d, 12, 0, 0, 0);
    for (let i = 0; i < 2; i++) {
      guess = Date.UTC(y, m - 1, d, 12, 0, 0, 0) - tzOffsetMs(tz, new Date(guess));
    }
    return new Date(guess);
  }

  const localDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (localDateTime) {
    const y = +localDateTime[1];
    const m = +localDateTime[2];
    const d = +localDateTime[3];
    const hh = +localDateTime[4];
    const mm = +localDateTime[5];
    const ss = +(localDateTime[6] ?? 0);
    if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59 || ss > 59) {
      throw new Error("INVALID_DATE");
    }
    let guess = Date.UTC(y, m - 1, d, hh, mm, ss, 0);
    for (let i = 0; i < 2; i++) {
      guess = Date.UTC(y, m - 1, d, hh, mm, ss, 0) - tzOffsetMs(tz, new Date(guess));
    }
    return new Date(guess);
  }

  const instant = new Date(v);
  if (Number.isNaN(instant.getTime())) throw new Error("INVALID_DATE");
  return instant;
}

/** Value for <input type="date"> from a stored UTC date in user TZ. */
export function toDateInputValue(date: Date, timeZone: string): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // already yyyy-MM-dd
}
