import { describe, it, expect } from 'vitest';
import { computeNextDue, isRecurrenceExpired, describeRecurrence } from './recurrence.js';
import type { RecurrenceRule } from '$lib/types/index.js';

// Helper to create dates at midnight local time
function d(dateStr: string): Date {
	return new Date(dateStr + 'T12:00:00');
}

describe('computeNextDue', () => {
	describe('daily', () => {
		it('advances by 1 day with interval=1', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getFullYear()).toBe(2026);
			expect(result.getMonth()).toBe(2); // March
			expect(result.getDate()).toBe(11);
		});

		it('advances by N days with interval=N', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 3 };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getDate()).toBe(13);
		});

		it('crosses month boundary', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
			const result = computeNextDue(d('2026-03-31'), rule)!;
			expect(result.getMonth()).toBe(3); // April
			expect(result.getDate()).toBe(1);
		});
	});

	describe('weekly without byweekday', () => {
		it('advances by 7 days with interval=1', () => {
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getDate()).toBe(17);
		});

		it('advances by 14 days with interval=2', () => {
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getDate()).toBe(24);
		});
	});

	describe('weekly with byweekday', () => {
		// 2026-03-10 is a Tuesday (JS day=2, our weekday=1)
		it('picks next day in same week', () => {
			// Tuesday due, rule says Mon(0), Thu(3) → next is Thursday
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, byweekday: [0, 3] };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getDate()).toBe(12); // Thursday Mar 12
		});

		it('wraps to first day of next week when no days left', () => {
			// Tuesday due, rule says Mon(0) only → next Monday
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, byweekday: [0] };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getDate()).toBe(16); // Monday Mar 16
		});

		it('skips weeks with interval=2', () => {
			// Friday (2026-03-13 is a Friday, weekday=4), rule: Fri every 2 weeks
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 2, byweekday: [4] };
			const result = computeNextDue(d('2026-03-13'), rule)!;
			expect(result.getDate()).toBe(27); // Friday Mar 27
		});

		it('handles multiple days across week boundary', () => {
			// Saturday (2026-03-14, weekday=5), rule: Mon(0), Wed(2) → next Mon
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, byweekday: [0, 2] };
			const result = computeNextDue(d('2026-03-14'), rule)!;
			expect(result.getDate()).toBe(16); // Monday Mar 16
		});
	});

	describe('monthly', () => {
		it('advances by 1 month', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			const result = computeNextDue(d('2026-01-15'), rule)!;
			expect(result.getMonth()).toBe(1); // February
			expect(result.getDate()).toBe(15);
		});

		it('advances by 2 months', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 2 };
			const result = computeNextDue(d('2026-01-15'), rule)!;
			expect(result.getMonth()).toBe(2); // March
			expect(result.getDate()).toBe(15);
		});

		it('clamps Jan 31 to Feb 28 in non-leap year', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			// 2026 is not a leap year
			const result = computeNextDue(d('2026-01-31'), rule)!;
			expect(result.getMonth()).toBe(1);
			expect(result.getDate()).toBe(28);
		});

		it('clamps Jan 31 to Feb 29 in leap year', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			// 2028 is a leap year
			const result = computeNextDue(d('2028-01-31'), rule)!;
			expect(result.getMonth()).toBe(1);
			expect(result.getDate()).toBe(29);
		});

		it('clamps Mar 31 to Apr 30', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			const result = computeNextDue(d('2026-03-31'), rule)!;
			expect(result.getMonth()).toBe(3); // April
			expect(result.getDate()).toBe(30);
		});

		it('handles Jan 29 to Feb 28 in non-leap year', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			const result = computeNextDue(d('2026-01-29'), rule)!;
			expect(result.getMonth()).toBe(1);
			expect(result.getDate()).toBe(28);
		});

		it('interval=2 from Jan 31 to Mar 31', () => {
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 2 };
			const result = computeNextDue(d('2026-01-31'), rule)!;
			expect(result.getMonth()).toBe(2); // March
			expect(result.getDate()).toBe(31);
		});
	});

	describe('time_of_day', () => {
		it('sets time when specified', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1, time_of_day: '09:00' };
			const result = computeNextDue(d('2026-03-10'), rule)!;
			expect(result.getHours()).toBe(9);
			expect(result.getMinutes()).toBe(0);
		});

		it('preserves original time when not specified', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
			const base = new Date('2026-03-10T14:30:00');
			const result = computeNextDue(base, rule)!;
			expect(result.getHours()).toBe(14);
			expect(result.getMinutes()).toBe(30);
		});
	});

	describe('end conditions', () => {
		it('returns date when ends type is never', () => {
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1, ends: { type: 'never' } };
			const result = computeNextDue(d('2026-03-10'), rule);
			expect(result).not.toBeNull();
		});

		it('returns date when next due is before end date', () => {
			const rule: RecurrenceRule = {
				frequency: 'daily',
				interval: 1,
				ends: { type: 'on_date', date: '2026-04-01' },
			};
			const result = computeNextDue(d('2026-03-10'), rule);
			expect(result).not.toBeNull();
		});

		it('returns null when next due exceeds end date', () => {
			const rule: RecurrenceRule = {
				frequency: 'daily',
				interval: 1,
				ends: { type: 'on_date', date: '2026-03-10' },
			};
			const result = computeNextDue(d('2026-03-10'), rule);
			expect(result).toBeNull();
		});

		it('returns date on the exact end date', () => {
			const rule: RecurrenceRule = {
				frequency: 'daily',
				interval: 1,
				ends: { type: 'on_date', date: '2026-03-11' },
			};
			const result = computeNextDue(d('2026-03-10'), rule);
			expect(result).not.toBeNull();
		});

		it('after_n_occurrences: returns next date when occurrences_completed < count', () => {
			const rule: RecurrenceRule = {
				frequency: 'daily',
				interval: 1,
				ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 2 },
			};
			expect(computeNextDue(d('2026-03-10'), rule)).not.toBeNull();
		});

		it('after_n_occurrences: returns null when occurrences_completed === count', () => {
			const rule: RecurrenceRule = {
				frequency: 'daily',
				interval: 1,
				ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 5 },
			};
			expect(computeNextDue(d('2026-03-10'), rule)).toBeNull();
		});
	});

	describe('DST boundaries (simulated)', () => {
		// These test that Date arithmetic doesn't skip or double hours
		// We use specific timestamps around typical DST transitions

		it('spring forward: daily recurrence preserves wall-clock day', () => {
			// US DST spring forward 2026: March 8
			// Due on March 7 → next is March 8 (still a valid date)
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
			const base = new Date(2026, 2, 7, 10, 0); // March 7, 10:00 local
			const result = computeNextDue(base, rule)!;
			expect(result.getDate()).toBe(8);
			expect(result.getMonth()).toBe(2);
		});

		it('fall back: daily recurrence preserves wall-clock day', () => {
			// US DST fall back 2026: November 1
			const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
			const base = new Date(2026, 10, 1, 2, 30); // Nov 1, 02:30 local
			const result = computeNextDue(base, rule)!;
			expect(result.getDate()).toBe(2);
			expect(result.getMonth()).toBe(10);
		});

		it('weekly recurrence across DST boundary', () => {
			const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 };
			const base = new Date(2026, 2, 7, 10, 0); // March 7 (Sat)
			const result = computeNextDue(base, rule)!;
			expect(result.getDate()).toBe(14);
		});

		it('monthly recurrence across DST boundary', () => {
			// Feb → March crosses DST
			const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
			const base = new Date(2026, 1, 15, 10, 0); // Feb 15
			const result = computeNextDue(base, rule)!;
			expect(result.getMonth()).toBe(2); // March
			expect(result.getDate()).toBe(15);
		});
	});
});

describe('isRecurrenceExpired', () => {
	it('returns false when no ends condition', () => {
		const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
		expect(isRecurrenceExpired(rule, new Date())).toBe(false);
	});

	it('returns false when ends type is never', () => {
		const rule: RecurrenceRule = { frequency: 'daily', interval: 1, ends: { type: 'never' } };
		expect(isRecurrenceExpired(rule, new Date())).toBe(false);
	});

	it('returns true when next due exceeds end date', () => {
		const rule: RecurrenceRule = {
			frequency: 'daily',
			interval: 1,
			ends: { type: 'on_date', date: '2026-03-10' },
		};
		expect(isRecurrenceExpired(rule, new Date('2026-03-11T00:00:00'))).toBe(true);
	});

	it('returns false when next due is before end date', () => {
		const rule: RecurrenceRule = {
			frequency: 'daily',
			interval: 1,
			ends: { type: 'on_date', date: '2026-03-15' },
		};
		expect(isRecurrenceExpired(rule, new Date('2026-03-11T00:00:00'))).toBe(false);
	});

	it('after_n_occurrences: returns false when occurrences_completed < count', () => {
		const rule: RecurrenceRule = {
			frequency: 'daily',
			interval: 1,
			ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 2 },
		};
		expect(isRecurrenceExpired(rule, new Date())).toBe(false);
	});

	it('after_n_occurrences: returns true when occurrences_completed === count', () => {
		const rule: RecurrenceRule = {
			frequency: 'daily',
			interval: 1,
			ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 5 },
		};
		expect(isRecurrenceExpired(rule, new Date())).toBe(true);
	});

	it('after_n_occurrences: returns true when occurrences_completed > count', () => {
		const rule: RecurrenceRule = {
			frequency: 'daily',
			interval: 1,
			ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 7 },
		};
		expect(isRecurrenceExpired(rule, new Date())).toBe(true);
	});
});

describe('describeRecurrence', () => {
	it('daily interval=1', () => {
		expect(describeRecurrence({ frequency: 'daily', interval: 1 })).toBe('Daily');
	});

	it('daily interval=3', () => {
		expect(describeRecurrence({ frequency: 'daily', interval: 3 })).toBe('Every 3 days');
	});

	it('weekly interval=1', () => {
		expect(describeRecurrence({ frequency: 'weekly', interval: 1 })).toBe('Weekly');
	});

	it('weekly with days', () => {
		expect(
			describeRecurrence({ frequency: 'weekly', interval: 1, byweekday: [0, 4] })
		).toBe('Weekly on Mon, Fri');
	});

	it('every 2 weeks with days', () => {
		expect(
			describeRecurrence({ frequency: 'weekly', interval: 2, byweekday: [0, 2, 4] })
		).toBe('Every 2 weeks on Mon, Wed, Fri');
	});

	it('monthly interval=1', () => {
		expect(describeRecurrence({ frequency: 'monthly', interval: 1 })).toBe('Monthly');
	});

	it('monthly interval=2', () => {
		expect(describeRecurrence({ frequency: 'monthly', interval: 2 })).toBe('Every 2 months');
	});

	it('with time_of_day', () => {
		expect(
			describeRecurrence({ frequency: 'daily', interval: 1, time_of_day: '09:00' })
		).toBe('Daily at 09:00');
	});

	it('with end date', () => {
		expect(
			describeRecurrence({
				frequency: 'weekly',
				interval: 1,
				ends: { type: 'on_date', date: '2026-12-31' },
			})
		).toBe('Weekly until 2026-12-31');
	});

	it('with ends never does not show until', () => {
		expect(
			describeRecurrence({ frequency: 'daily', interval: 1, ends: { type: 'never' } })
		).toBe('Daily');
	});

	it('after_n_occurrences: shows remaining times (plural)', () => {
		expect(
			describeRecurrence({
				frequency: 'daily',
				interval: 1,
				ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 0 },
			})
		).toBe('Daily for 5 more times');
	});

	it('after_n_occurrences: shows remaining times with some completed', () => {
		expect(
			describeRecurrence({
				frequency: 'daily',
				interval: 1,
				ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 3 },
			})
		).toBe('Daily for 2 more times');
	});

	it('after_n_occurrences: uses singular "time" when 1 remaining', () => {
		expect(
			describeRecurrence({
				frequency: 'daily',
				interval: 1,
				ends: { type: 'after_n_occurrences', count: 5, occurrences_completed: 4 },
			})
		).toBe('Daily for 1 more time');
	});

	it('after_n_occurrences: combined with days and time', () => {
		expect(
			describeRecurrence({
				frequency: 'weekly',
				interval: 1,
				byweekday: [0, 4],
				time_of_day: '09:00',
				ends: { type: 'after_n_occurrences', count: 10, occurrences_completed: 7 },
			})
		).toBe('Weekly on Mon, Fri at 09:00 for 3 more times');
	});
});
