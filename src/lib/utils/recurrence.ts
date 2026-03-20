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
			next.setDate(next.getDate() + rule.interval);
			break;

		case 'weekly':
			if (rule.byweekday && rule.byweekday.length > 0) {
				const result = computeNextWeekday(currentDue, rule.byweekday, rule.interval);
				next.setTime(result.getTime());
			} else {
				next.setDate(next.getDate() + 7 * rule.interval);
			}
			break;

		case 'monthly':
			next.setTime(addMonthsClamped(currentDue, rule.interval).getTime());
			break;
	}

	// Apply time_of_day if set
	if (rule.time_of_day) {
		const [hours, minutes] = rule.time_of_day.split(':').map(Number);
		next.setHours(hours, minutes, 0, 0);
	}

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
	// Convert our 0=Mon..6=Sun to JS 0=Sun..6=Sat
	const fromJsDay = (d: number) => (d + 6) % 7;

	const currentJsDay = currentDue.getDay();
	const currentWeekday = fromJsDay(currentJsDay);

	// Sort weekdays
	const sorted = [...byweekday].sort((a, b) => a - b);

	const nextInWeek = sorted.find((d) => d > currentWeekday);
	if (nextInWeek !== undefined) {
		const daysAhead = nextInWeek - currentWeekday;
		const result = new Date(currentDue);
		result.setDate(result.getDate() + daysAhead);
		return result;
	}

	// Jump to first matching day of the next interval-week cycle
	const daysUntilEndOfWeek = 6 - currentWeekday;
	const daysToNextWeekStart = daysUntilEndOfWeek + 1 + 7 * (interval - 1);
	const daysToFirstMatch = daysToNextWeekStart + sorted[0];

	const result = new Date(currentDue);
	result.setDate(result.getDate() + daysToFirstMatch);
	return result;
}

/**
 * Add months to a date, clamping the day to the last day of the target month.
 * e.g., Jan 31 + 1 month = Feb 28 (or 29 in leap year)
 */
function addMonthsClamped(date: Date, months: number): Date {
	const result = new Date(date);
	const originalDay = date.getDate();

	result.setMonth(result.getMonth() + months, 1); // Set to 1st to avoid overflow
	const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
	result.setDate(Math.min(originalDay, lastDayOfMonth));

	return result;
}

/**
 * Check if a recurrence rule has expired given a candidate next due date.
 */
export function isRecurrenceExpired(rule: RecurrenceRule, nextDue: Date): boolean {
	if (!rule.ends || rule.ends.type === 'never') return false;
	if (rule.ends.type === 'on_date') {
		const endDate = new Date(rule.ends.date + 'T23:59:59.999');
		return nextDue > endDate;
	}
	if (rule.ends.type === 'after_n_occurrences') {
		return rule.ends.occurrences_completed >= rule.ends.count;
	}
	return false;
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

	if (rule.time_of_day) {
		parts.push(`at ${rule.time_of_day}`);
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
