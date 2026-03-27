import type { Task } from '$lib/types/index.js';

export type SortKey =
	| 'created_desc'
	| 'created_asc'
	| 'due_asc'
	| 'due_desc'
	| 'priority_asc'
	| 'priority_desc';

export type DueFilter = 'overdue' | 'today' | 'this_week' | 'no_date' | null;

export const SORT_LABELS: Record<SortKey, string> = {
	created_desc: 'Created (newest)',
	created_asc: 'Created (oldest)',
	due_asc: 'Due date (earliest)',
	due_desc: 'Due date (latest)',
	priority_asc: 'Priority (highest)',
	priority_desc: 'Priority (lowest)'
};

export const PRIORITY_LABELS = ['P1', 'P2', 'P3', 'P4'];

export const DUE_FILTERS: { value: DueFilter; label: string }[] = [
	{ value: 'overdue', label: 'Overdue' },
	{ value: 'today', label: 'Today' },
	{ value: 'this_week', label: 'This week' },
	{ value: 'no_date', label: 'No date' }
];

export const PRIORITY_ACTIVE_CLASSES = [
	'bg-red-50 text-red-700 border-red-200',
	'bg-orange-50 text-orange-600 border-orange-200',
	'bg-blue-50 text-blue-600 border-blue-200',
	'bg-surface-subtle text-foreground-secondary border-border'
];

export const DUE_ACTIVE_CLASSES: Record<string, string> = {
	overdue: 'bg-red-50 text-red-700 border-red-200',
	today: 'bg-primary-tint text-primary border-primary',
	this_week: 'bg-blue-50 text-blue-600 border-blue-200',
	no_date: 'bg-surface-subtle text-foreground-secondary border-border'
};

function dayBounds() {
	const now = new Date();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(now);
	end.setHours(23, 59, 59, 999);
	const weekEnd = new Date(now);
	weekEnd.setDate(weekEnd.getDate() + 7);
	weekEnd.setHours(23, 59, 59, 999);
	return { startMs: start.getTime(), endMs: end.getTime(), weekEndMs: weekEnd.getTime() };
}

export function filterTasks(
	tasks: Task[],
	priority: number | null,
	due: DueFilter
): Task[] {
	let result = tasks;

	if (priority !== null) {
		result = result.filter((t) => t.priority === priority);
	}

	if (due !== null) {
		const { startMs, endMs, weekEndMs } = dayBounds();
		if (due === 'overdue') {
			result = result.filter((t) => t.due_at && new Date(t.due_at).getTime() < startMs);
		} else if (due === 'today') {
			result = result.filter((t) => {
				if (!t.due_at) return false;
				const ms = new Date(t.due_at).getTime();
				return ms >= startMs && ms <= endMs;
			});
		} else if (due === 'this_week') {
			result = result.filter((t) => {
				if (!t.due_at) return false;
				const ms = new Date(t.due_at).getTime();
				return ms > endMs && ms <= weekEndMs;
			});
		} else if (due === 'no_date') {
			result = result.filter((t) => !t.due_at);
		}
	}

	return result;
}

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
	const sorted = tasks.map((task) => ({
		task,
		createdMs: task.created_at ? new Date(task.created_at).getTime() : 0,
		dueMs: task.due_at ? new Date(task.due_at).getTime() : Infinity
	}));

	sorted.sort((a, b) => {
		switch (key) {
			case 'created_asc':
				return a.createdMs - b.createdMs;
			case 'created_desc':
				return b.createdMs - a.createdMs;
			case 'due_asc':
				if (!a.task.due_at && !b.task.due_at) return 0;
				if (!a.task.due_at) return 1;
				if (!b.task.due_at) return -1;
				return a.dueMs - b.dueMs;
			case 'due_desc':
				if (!a.task.due_at && !b.task.due_at) return 0;
				if (!a.task.due_at) return 1;
				if (!b.task.due_at) return -1;
				return b.dueMs - a.dueMs;
			case 'priority_asc':
				return (a.task.priority ?? 4) - (b.task.priority ?? 4);
			case 'priority_desc':
				return (b.task.priority ?? 4) - (a.task.priority ?? 4);
			default:
				return 0;
		}
	});

	return sorted.map((w) => w.task);
}
