import type { Task } from '$lib/types/index.js';
import { hasTime } from '$lib/utils/dates.js';

export interface CalendarDay {
  isoDate: string;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dueTasks: Task[];
  timedDueTasks: Task[];
  startTasks: Task[];
}

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function makeDay(date: Date, currentMonth: number, todayStr: string): CalendarDay {
  const isoDate = date.toISOString().slice(0, 10);
  return {
    isoDate,
    date,
    isCurrentMonth: date.getMonth() === currentMonth,
    isToday: isoDate === todayStr,
    dueTasks: [],
    timedDueTasks: [],
    startTasks: [],
  };
}

// Build 42-cell (6-week) grid for a given year/month (0-indexed month)
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const today = todayIso();
  const firstOfMonth = new Date(year, month, 1);
  // Start on Monday: getDay() returns 0=Sun, so adjust
  let startDow = firstOfMonth.getDay(); // 0=Sun
  // Convert to Mon-based: Mon=0 … Sun=6
  startDow = (startDow + 6) % 7;

  const days: CalendarDay[] = [];
  const cursor = new Date(year, month, 1 - startDow);

  for (let i = 0; i < 42; i++) {
    days.push(makeDay(new Date(cursor), month, today));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// Build 7-cell array for the Mon–Sun week containing the given date
export function buildWeekGrid(anchorDate: Date): CalendarDay[] {
  const today = todayIso();
  const dow = (anchorDate.getDay() + 6) % 7; // Mon=0
  const cursor = new Date(anchorDate);
  cursor.setDate(cursor.getDate() - dow);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(makeDay(new Date(cursor), cursor.getMonth(), today));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Distribute tasks into CalendarDay[] by due_at and start_at
export function distributeTasks(days: CalendarDay[], tasks: Task[]): CalendarDay[] {
  const dayMap = new Map<string, CalendarDay>();
  for (const day of days) dayMap.set(day.isoDate, day);

  for (const task of tasks) {
    if (task.due_at) {
      const iso = task.due_at.slice(0, 10);
      const day = dayMap.get(iso);
      if (day) {
        if (hasTime(task.due_at)) {
          day.timedDueTasks.push(task);
        } else {
          day.dueTasks.push(task);
        }
      }
    }
    if (task.start_at) {
      const iso = task.start_at.slice(0, 10);
      const day = dayMap.get(iso);
      if (day) {
        day.startTasks.push(task);
      }
    }
  }

  return days;
}

// Parse "YYYY-MM" or "YYYY-MM-DD" URL param → Date
export function parseDateParam(param: string | null, fallback: Date): Date {
  if (!param) return fallback;
  // "YYYY-MM" → first of month
  if (/^\d{4}-\d{2}$/.test(param)) {
    const d = new Date(param + '-01T12:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  // "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const d = new Date(param + 'T12:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

// Compute date range for month grid (adds 6-day padding on each side)
export function computeMonthGridRange(anchor: Date): { start: Date; end: Date } {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  let startDow = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startDow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 41);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Compute Mon–Sun week range
export function computeWeekRange(anchor: Date): { start: Date; end: Date } {
  const dow = (anchor.getDay() + 6) % 7;
  const start = new Date(anchor);
  start.setDate(start.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Merge two task arrays by id (deduplicate)
export function mergeTasks(a: Task[], b: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of a) map.set(t.id, t);
  for (const t of b) map.set(t.id, t);
  return Array.from(map.values());
}

// Format month label: "March 2026"
export function formatMonthLabel(anchor: Date): string {
  return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Format week label: "Mar 16 – 22, 2026"
export function formatWeekLabel(days: CalendarDay[]): string {
  if (days.length < 7) return '';
  const start = days[0].date;
  const end = days[6].date;
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = sameMonth
    ? end.toLocaleDateString(undefined, { day: 'numeric' })
    : end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}
