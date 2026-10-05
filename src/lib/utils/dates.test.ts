import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addDaysToKey,
  daysFromToday,
  formatDateOnly,
  quickDate,
  resolveTimeZone,
  startOfDayInZone,
  toDateInputValue,
  todayKey,
} from './dates';
import { getDueDateClass } from './design-tokens';
import { filterTasks } from './sort-filter';
import { buildMonthGrid, distributeTasks } from './calendar';
import type { Task } from '$lib/types/index.js';

const originalTz = process.env.TZ;

/** Pretend the device is in `tz` and the clock reads `nowIso`. */
function setDevice(tz: string, nowIso: string) {
  process.env.TZ = tz;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(nowIso));
}

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTz;
});

const due = (key: string) => `${key}T00:00:00+00:00`;
const task = (key: string | null) => ({ id: key ?? 'none', priority: 4, due_at: key ? due(key) : null }) as Task;

describe('toDateInputValue', () => {
  it.each(['America/Los_Angeles', 'UTC', 'Europe/Berlin', 'Pacific/Auckland'])(
    'returns the stored UTC date in %s',
    (tz) => {
      process.env.TZ = tz;
      expect(toDateInputValue('2026-10-05T00:00:00.000Z')).toBe('2026-10-05');
      expect(toDateInputValue('2026-10-05T00:00:00+00:00')).toBe('2026-10-05');
    }
  );

  it('returns an empty string for missing or unparseable values', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue('')).toBe('');
    expect(toDateInputValue('2026-10-05T00:00:00.000ZT00:00:00.000Z')).toBe('');
  });
});

describe('todayKey', () => {
  // 22:30 UTC on Oct 4 is already Oct 5 in Berlin and still Oct 4 in Los Angeles.
  const now = new Date('2026-10-04T22:30:00Z');

  it('gives the date in the requested time zone', () => {
    expect(todayKey('Europe/Berlin', now)).toBe('2026-10-05');
    expect(todayKey('UTC', now)).toBe('2026-10-04');
    expect(todayKey('America/Los_Angeles', now)).toBe('2026-10-04');
    expect(todayKey('Pacific/Auckland', now)).toBe('2026-10-05');
  });

  it('uses the device clock when no time zone is given', () => {
    setDevice('Europe/Berlin', '2026-10-04T22:30:00Z');
    expect(todayKey()).toBe('2026-10-05');
    setDevice('America/Los_Angeles', '2026-10-05T03:00:00Z');
    expect(todayKey()).toBe('2026-10-04');
  });
});

describe('resolveTimeZone', () => {
  it('keeps valid zones and falls back to UTC otherwise', () => {
    expect(resolveTimeZone('Europe/Berlin')).toBe('Europe/Berlin');
    expect(resolveTimeZone('Not/AZone')).toBe('UTC');
    expect(resolveTimeZone(undefined)).toBe('UTC');
    expect(resolveTimeZone('')).toBe('UTC');
  });
});

describe('addDaysToKey', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2026-12-31', 7)).toBe('2027-01-07');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('startOfDayInZone', () => {
  it('returns the instant the local day begins', () => {
    expect(startOfDayInZone('2026-10-05', 'Europe/Berlin').toISOString()).toBe('2026-10-04T22:00:00.000Z');
    expect(startOfDayInZone('2026-10-05', 'America/Los_Angeles').toISOString()).toBe('2026-10-05T07:00:00.000Z');
    expect(startOfDayInZone('2026-10-05', 'UTC').toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('handles the days around a DST change', () => {
    // Berlin leaves summer time on 2026-10-25: that day starts at +02:00, the next at +01:00.
    expect(startOfDayInZone('2026-10-25', 'Europe/Berlin').toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(startOfDayInZone('2026-10-26', 'Europe/Berlin').toISOString()).toBe('2026-10-25T23:00:00.000Z');
  });
});

// The two windows where the local date and the UTC date disagree.
describe.each([
  { name: 'just after local midnight east of UTC', tz: 'Europe/Berlin', now: '2026-10-04T22:30:00Z', today: '2026-10-05' },
  { name: 'evening west of UTC', tz: 'America/Los_Angeles', now: '2026-10-06T03:00:00Z', today: '2026-10-05' },
  { name: 'mid-morning east of UTC', tz: 'Europe/Berlin', now: '2026-10-05T08:00:00Z', today: '2026-10-05' },
])('local today — $name', ({ tz, now, today }) => {
  const yesterday = addDaysToKey(today, -1);
  const tomorrow = addDaysToKey(today, 1);

  it('counts days from the local date', () => {
    setDevice(tz, now);
    expect(daysFromToday(due(today))).toBe(0);
    expect(daysFromToday(due(yesterday))).toBe(-1);
    expect(daysFromToday(due(tomorrow))).toBe(1);
    expect(daysFromToday(null)).toBeNull();
  });

  it('labels Today and Tomorrow', () => {
    setDevice(tz, now);
    expect(formatDateOnly(due(today))).toBe('Today');
    expect(formatDateOnly(due(tomorrow))).toBe('Tomorrow');
    expect(formatDateOnly(due(yesterday))).not.toMatch(/Today|Tomorrow/);
  });

  it('sets quick dates from the local date', () => {
    setDevice(tz, now);
    expect(quickDate(0)).toBe(`${today}T00:00:00.000Z`);
    expect(quickDate(1)).toBe(`${tomorrow}T00:00:00.000Z`);
  });

  it('colours due dates', () => {
    setDevice(tz, now);
    expect(getDueDateClass(due(yesterday))).toBe('due-overdue');
    expect(getDueDateClass(due(today))).toBe('due-today');
    expect(getDueDateClass(due(addDaysToKey(today, 3)))).toBe('due-soon');
    expect(getDueDateClass(due(addDaysToKey(today, 4)))).toBe('');
    expect(getDueDateClass(null)).toBe('');
  });

  it('filters by due date', () => {
    setDevice(tz, now);
    const tasks = [task(yesterday), task(today), task(tomorrow), task(addDaysToKey(today, 7)), task(addDaysToKey(today, 8)), task(null)];
    const ids = (f: Parameters<typeof filterTasks>[2]) => filterTasks(tasks, null, f).map((t) => t.id);
    expect(ids('overdue')).toEqual([yesterday]);
    expect(ids('today')).toEqual([today]);
    expect(ids('this_week')).toEqual([tomorrow, addDaysToKey(today, 7)]);
    expect(ids('no_date')).toEqual(['none']);
  });

  it('puts tasks on the right calendar day and marks today', () => {
    setDevice(tz, now);
    const days = distributeTasks(buildMonthGrid(2026, 9), [task(today)]);
    const cell = days.find((d) => d.dueTasks.length > 0);
    expect(cell?.date.getDate()).toBe(Number(today.slice(8)));
    expect(cell?.isoDate).toBe(today);
    expect(days.filter((d) => d.isToday).map((d) => d.isoDate)).toEqual([today]);
  });
});
