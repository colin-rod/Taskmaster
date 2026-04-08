export function toDateString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

export function formatDateOnly(due_at: string | null): string {
  if (!due_at) return 'No date';
  const date = new Date(due_at);
  const todayUtc = new Date();
  const todayY = todayUtc.getUTCFullYear();
  const todayM = todayUtc.getUTCMonth();
  const todayD = todayUtc.getUTCDate();
  const dateY = date.getUTCFullYear();
  const dateM = date.getUTCMonth();
  const dateD = date.getUTCDate();
  if (dateY === todayY && dateM === todayM && dateD === todayD) return 'Today';
  const tomorrowMs = Date.UTC(todayY, todayM, todayD + 1);
  const dateMs = Date.UTC(dateY, dateM, dateD);
  if (dateMs === tomorrowMs) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatDisplay(due_at: string | null): string {
  return formatDateOnly(due_at);
}

export function formatShortDate(due_at: string): string {
  const date = new Date(due_at);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
