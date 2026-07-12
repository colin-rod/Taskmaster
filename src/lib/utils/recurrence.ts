import type { RecurrenceRule } from '$lib/types/index.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Compute the next due date for a recurring task.
 * Uses currentDue as the base to avoid drift.
 * Returns null if the recurrence has expired (past end date).
 */
export function computeNextDue(currentDue: Date, rule: RecurrenceRule): Date | null {
	const next = new Date(currentDue);

	switch (rule.frequency) {
		case 'daily':
			next.setUTCDate(next.getUTCDate() + rule.interval);
			break;

		case 'weekly':
			if (rule.byweekday && rule.byweekday.length > 0) {
				const result = computeNextWeekday(currentDue, rule.byweekday, rule.interval);
				next.setTime(result.getTime());
			} else {
				next.setUTCDate(next.getUTCDate() + 7 * rule.interval);
			}
			break;

		case 'monthly':
			next.setTime(addMonthsClamped(currentDue, rule.interval).getTime());
			break;
	}

	// Normalize to midnight UTC
	next.setUTCHours(0, 0, 0, 0);

	// Check end condition
	if (isRecurrenceExpired(rule, next)) {
		return null;
	}

	return next;
}

/**
 * Find the next occurrence for a weekly rule with specific weekdays.
 * byweekday uses 0=Mon..6=Sun. JS getDay() uses 0=Sun..6=Sat.
 */
function computeNextWeekday(currentDue: Date, byweekday: number[], interval: number): Date {
	// Convert JS UTC day (0=Sun..6=Sat) to our weekday (0=Mon..6=Sun)
	const fromJsDay = (d: number) => (d + 6) % 7;

	const currentJsDay = currentDue.getUTCDay();
	const currentWeekday = fromJsDay(currentJsDay);

	// Sort weekdays
	const sorted = [...byweekday].sort((a, b) => a - b);

	// Look for a later scheduled day in the current week.
	// When interval > 1, only do this if the base date is itself a scheduled day
	// (i.e., advancing from one scheduled day to the next within the same week).
	// Otherwise we'd skip the interval gap — e.g. completing on Thursday with
	// "every 2 weeks on Sunday" would wrongly return this Sunday instead of 2 weeks out.
	const canUseSameWeek = interval === 1 || byweekday.includes(currentWeekday);
	if (canUseSameWeek) {
		const nextInWeek = sorted.find((d) => d > currentWeekday);
		if (nextInWeek !== undefined) {
			const daysAhead = nextInWeek - currentWeekday;
			const result = new Date(currentDue);
			result.setUTCDate(result.getUTCDate() + daysAhead);
			return result;
		}
	}

	// Jump to first matching day of the next interval-week cycle
	const daysUntilEndOfWeek = 6 - currentWeekday;
	const daysToNextWeekStart = daysUntilEndOfWeek + 1 + 7 * (interval - 1);
	const daysToFirstMatch = daysToNextWeekStart + sorted[0];

	const result = new Date(currentDue);
	result.setUTCDate(result.getUTCDate() + daysToFirstMatch);
	return result;
}

/**
 * Add months to a date, clamping the day to the last day of the target month.
 * e.g., Jan 31 + 1 month = Feb 28 (or 29 in leap year)
 */
function addMonthsClamped(date: Date, months: number): Date {
	const result = new Date(date);
	const originalDay = date.getUTCDate();

	result.setUTCMonth(result.getUTCMonth() + months, 1); // Set to 1st to avoid overflow
	const lastDayOfMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
	result.setUTCDate(Math.min(originalDay, lastDayOfMonth));

	return result;
}

/**
 * Check if a recurrence rule has expired given a candidate next due date.
 */
export function isRecurrenceExpired(rule: RecurrenceRule, nextDue: Date): boolean {
	if (!rule.ends || rule.ends.type === 'never') return false;
	if (rule.ends.type === 'on_date') {
		const endDate = new Date(rule.ends.date + 'T23:59:59.999Z');
		return nextDue > endDate;
	}
	if (rule.ends.type === 'after_n_occurrences') {
		return rule.ends.occurrences_completed >= rule.ends.count;
	}
	return false;
}

/**
 * Compute the next N upcoming occurrences starting from the given due date.
 * Does not include the current due_at itself — only future dates.
 * Stops early if the recurrence expires before reaching count.
 */
export function getUpcomingOccurrences(due_at: string, rule: RecurrenceRule, count: number = 5): Date[] {
	const results: Date[] = [];
	let current = new Date(due_at);
	while (results.length < count) {
		const next = computeNextDue(current, rule);
		if (!next) break;
		results.push(next);
		current = next;
	}
	return results;
}

/**
 * Human-readable description of a recurrence rule.
 */
export function describeRecurrence(rule: RecurrenceRule): string {
	const parts: string[] = [];

	if (rule.interval === 1) {
		switch (rule.frequency) {
			case 'daily':
				parts.push('Daily');
				break;
			case 'weekly':
				parts.push('Weekly');
				break;
			case 'monthly':
				parts.push('Monthly');
				break;
		}
	} else {
		const unit = rule.frequency === 'daily' ? 'days' : rule.frequency === 'weekly' ? 'weeks' : 'months';
		parts.push(`Every ${rule.interval} ${unit}`);
	}

	if (rule.frequency === 'weekly' && rule.byweekday && rule.byweekday.length > 0) {
		const dayNames = [...rule.byweekday].sort((a, b) => a - b).map((d) => DAY_NAMES[d]);
		parts.push(`on ${dayNames.join(', ')}`);
	}

	if (rule.ends?.type === 'on_date') {
		parts.push(`until ${rule.ends.date}`);
	}

	if (rule.ends?.type === 'after_n_occurrences') {
		const remaining = Math.max(0, rule.ends.count - rule.ends.occurrences_completed);
		parts.push(remaining === 1 ? 'for 1 more time' : `for ${remaining} more times`);
	}

	return parts.join(' ');
}
