// Due dates are calendar dates, stored as midnight UTC. "Today" is the calendar
// date where the user is, not the UTC date. So dates are compared as YYYY-MM-DD
// keys: the stored value's UTC date against the user's local date.
//
// In the browser the local date comes from the device. On the server pass
// `locals.timeZone` (the `tz` cookie, see hooks.server.ts) — the server's own
// clock is UTC and knows nothing about where the user is.

export const DEFAULT_TIME_ZONE = 'UTC';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A time zone name the runtime accepts, or the default if it doesn't. */
export function resolveTimeZone(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** YYYY-MM-DD of a Date as the device's own clock sees it. */
export function localDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Today's date as YYYY-MM-DD, in `timeZone` or (without one) on this device. */
export function todayKey(timeZone?: string, now: Date = new Date()): string {
  if (!timeZone) return localDateKey(now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The stored form of a calendar date: midnight UTC. */
export function dateKeyToIso(key: string): string {
  return `${key}T00:00:00.000Z`;
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(dateKeyToIso(key));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whole days from today to a stored date: 0 is today, negative is in the past.
 * Null when there is no (valid) date.
 */
export function daysFromToday(iso: string | null | undefined, timeZone?: string): number | null {
  const key = toDateInputValue(iso);
  if (!key) return null;
  const diff = Date.parse(dateKeyToIso(key)) - Date.parse(dateKeyToIso(todayKey(timeZone)));
  return Math.round(diff / DAY_MS);
}

/** Stored due date for "N days from today" (the quick-date buttons). */
export function quickDate(daysFromNow: number): string {
  return dateKeyToIso(addDaysToKey(todayKey(), daysFromNow));
}

export function quickDateNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return dateKeyToIso(localDateKey(d));
}

/** The instant a calendar day begins in `timeZone` — for timestamp columns such as completed_at. */
export function startOfDayInZone(key: string, timeZone: string): Date {
  const utcMidnight = Date.parse(dateKeyToIso(key));
  // The offset is looked up twice because it can differ either side of a DST change.
  let ts = utcMidnight - zoneOffsetMs(timeZone, utcMidnight);
  ts = utcMidnight - zoneOffsetMs(timeZone, ts);
  return new Date(ts);
}

function zoneOffsetMs(timeZone: string, ts: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return wallAsUtc - Math.floor(ts / 1000) * 1000;
}

export function toDateString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

// YYYY-MM-DD for <input type="date">. Due dates are stored as midnight UTC, so
// read the UTC date — local getters show the previous day west of UTC.
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function formatDateOnly(due_at: string | null): string {
  if (!due_at) return 'No date';
  const days = daysFromToday(due_at);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return new Date(due_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function formatDisplay(due_at: string | null): string {
  return formatDateOnly(due_at);
}

export function formatShortDate(due_at: string): string {
  const date = new Date(due_at);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
