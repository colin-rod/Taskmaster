/**
 * Relative reminders — reminders expressed as an offset before a task's due
 * date ("day before", "week before") rather than as a fixed instant.
 *
 * The offset is what gets stored; the actual send time is resolved from
 * `due_at` at delivery time, so a reminder follows the due date when it moves.
 * That matters most on recurring tasks, where the due date moves on every
 * completion.
 *
 * `due_at` carries no time of day — it is stored as midnight UTC (see the
 * `due_at` normalisation in /api/tasks/[id], and the 20260325 migration that
 * removed time-of-day). So an offset alone would resolve every reminder to
 * midnight, which is a useless hour to be notified. REMINDER_HOUR_UTC pins the
 * hour reminders actually fire.
 */

/** Hour of day (UTC) at which a resolved relative reminder fires. */
export const REMINDER_HOUR_UTC = 9;

const MINUTES_PER_DAY = 1440;

export interface ReminderPreset {
  /** Stored in tasks.reminder_offset_minutes. */
  minutes: number;
  /** Menu label. */
  label: string;
}

/**
 * Offsets offered in the UI. Ordered nearest-to-furthest from the due date,
 * which is the order people scan for "how much warning do I want".
 */
export const REMINDER_PRESETS: ReminderPreset[] = [
  { minutes: 0, label: 'Day of' },
  { minutes: 1 * MINUTES_PER_DAY, label: 'Day before' },
  { minutes: 2 * MINUTES_PER_DAY, label: '2 days before' },
  { minutes: 3 * MINUTES_PER_DAY, label: '3 days before' },
  { minutes: 7 * MINUTES_PER_DAY, label: 'Week before' },
];

/**
 * Resolve a relative reminder to the instant it should fire.
 *
 * Returns null when the task has no due date, since there is nothing to be
 * relative to — the DB constraint rejects that combination, but callers read
 * rows that predate it and API payloads that have not been through it yet.
 */
export function resolveReminderAt(
  dueAt: string | null | undefined,
  offsetMinutes: number | null | undefined
): Date | null {
  if (!dueAt || offsetMinutes == null) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  // Take the due *date* and set the send hour on it, then step back by the
  // offset. Applying the hour before subtracting (rather than after) keeps
  // whole-day offsets landing on the intended calendar day.
  const at = new Date(due);
  at.setUTCHours(REMINDER_HOUR_UTC, 0, 0, 0);
  at.setUTCMinutes(at.getUTCMinutes() - offsetMinutes);
  return at;
}

/** Human label for a stored offset, for display on a task that has one set. */
export function describeReminderOffset(offsetMinutes: number | null | undefined): string {
  if (offsetMinutes == null) return '';
  const preset = REMINDER_PRESETS.find((p) => p.minutes === offsetMinutes);
  if (preset) return preset.label;

  // Offsets that don't match a preset can exist — set before the preset list
  // changed, or written directly through the API.
  if (offsetMinutes === 0) return 'Day of';
  if (offsetMinutes % MINUTES_PER_DAY === 0) {
    const days = offsetMinutes / MINUTES_PER_DAY;
    return days === 1 ? 'Day before' : `${days} days before`;
  }
  const hours = Math.round(offsetMinutes / 60);
  return hours === 1 ? 'Hour before' : `${hours} hours before`;
}
