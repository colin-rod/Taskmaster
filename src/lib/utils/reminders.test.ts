import { describe, it, expect } from 'vitest';
import {
  resolveReminderAt,
  describeReminderOffset,
  REMINDER_PRESETS,
  REMINDER_HOUR_UTC,
} from './reminders.js';

// due_at is always stored as midnight UTC (time-of-day was removed in the
// 20260325 migration), so every case here uses that shape.
const DUE = '2026-03-15T00:00:00.000Z';

describe('resolveReminderAt', () => {
  it('fires on the due date at the reminder hour for a zero offset', () => {
    const at = resolveReminderAt(DUE, 0);
    expect(at?.toISOString()).toBe(`2026-03-15T0${REMINDER_HOUR_UTC}:00:00.000Z`);
  });

  it('lands on the previous calendar day for a one-day offset', () => {
    const at = resolveReminderAt(DUE, 1440);
    expect(at?.toISOString()).toBe('2026-03-14T09:00:00.000Z');
  });

  it('lands a week earlier for a week offset', () => {
    const at = resolveReminderAt(DUE, 7 * 1440);
    expect(at?.toISOString()).toBe('2026-03-08T09:00:00.000Z');
  });

  it('keeps every preset on a whole-day boundary at the reminder hour', () => {
    for (const preset of REMINDER_PRESETS) {
      const at = resolveReminderAt(DUE, preset.minutes);
      expect(at?.getUTCHours(), preset.label).toBe(REMINDER_HOUR_UTC);
      expect(at?.getUTCMinutes(), preset.label).toBe(0);
    }
  });

  it('crosses month and year boundaries correctly', () => {
    expect(resolveReminderAt('2026-01-02T00:00:00.000Z', 7 * 1440)?.toISOString()).toBe(
      '2025-12-26T09:00:00.000Z'
    );
  });

  it('handles a leap day', () => {
    expect(resolveReminderAt('2028-03-01T00:00:00.000Z', 1440)?.toISOString()).toBe(
      '2028-02-29T09:00:00.000Z'
    );
  });

  it('returns null without a due date or an offset', () => {
    expect(resolveReminderAt(null, 1440)).toBeNull();
    expect(resolveReminderAt(DUE, null)).toBeNull();
    expect(resolveReminderAt(undefined, undefined)).toBeNull();
  });

  it('returns null for an unparseable due date', () => {
    expect(resolveReminderAt('not-a-date', 0)).toBeNull();
  });

  it('moves with the due date — the point of storing an offset', () => {
    const before = resolveReminderAt('2026-03-15T00:00:00.000Z', 1440);
    const after = resolveReminderAt('2026-04-20T00:00:00.000Z', 1440);
    expect(before?.toISOString()).toBe('2026-03-14T09:00:00.000Z');
    expect(after?.toISOString()).toBe('2026-04-19T09:00:00.000Z');
  });
});

describe('describeReminderOffset', () => {
  it('labels the presets', () => {
    expect(describeReminderOffset(0)).toBe('Day of');
    expect(describeReminderOffset(1440)).toBe('Day before');
    expect(describeReminderOffset(2 * 1440)).toBe('2 days before');
    expect(describeReminderOffset(7 * 1440)).toBe('Week before');
  });

  it('labels non-preset day and hour offsets', () => {
    expect(describeReminderOffset(10 * 1440)).toBe('10 days before');
    expect(describeReminderOffset(60)).toBe('Hour before');
    expect(describeReminderOffset(180)).toBe('3 hours before');
  });

  it('is empty when no offset is set', () => {
    expect(describeReminderOffset(null)).toBe('');
    expect(describeReminderOffset(undefined)).toBe('');
  });
});
