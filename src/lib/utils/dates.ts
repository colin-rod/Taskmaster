export function hasTime(due_at: string): boolean {
  return !due_at.endsWith('T12:00:00.000Z');
}

export function buildDueAt(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  if (!timeStr) return toDateString(new Date(dateStr + 'T12:00:00'));
  return new Date(dateStr + 'T' + timeStr + ':00').toISOString();
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0] + 'T12:00:00.000Z';
}

export function formatTimeBlock(
  start_at: string | null,
  duration_minutes: number | null
): string | null {
  if (!start_at) return null;
  const start = new Date(start_at);
  const startDate = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!duration_minutes) return `${startDate}, ${startTime}`;
  const end = new Date(start.getTime() + duration_minutes * 60_000);
  const endDate = end.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (startDate === endDate) return `${startDate}, ${startTime} – ${endTime}`;
  return `${startDate}, ${startTime} – ${endDate}, ${endTime}`;
}

export function formatDisplay(due_at: string | null): string {
  if (!due_at) return 'No date';
  const date = new Date(due_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const showTime = hasTime(due_at);
  const timeStr = showTime
    ? ', ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';

  if (dateOnly.getTime() === today.getTime()) return 'Today' + timeStr;
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow' + timeStr;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + timeStr;
}
