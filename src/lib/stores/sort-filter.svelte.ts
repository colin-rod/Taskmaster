import type { Task } from '$lib/types/index.js';
import {
	filterTasks,
	sortTasks,
	ACTIVE_SORT_KEYS,
	type SortKey,
	type DueFilter
} from '$lib/utils/sort-filter.js';

export function createSortFilterState(
	tasksFn: () => Task[],
	options: { defaultSort?: SortKey; sortKeys?: SortKey[] } = {}
) {
	const sortKeys = options.sortKeys ?? ACTIVE_SORT_KEYS;
	let sortKey = $state<SortKey>(options.defaultSort ?? 'due_asc');
	let filterPriority = $state<number | null>(null);
	let filterDue = $state<DueFilter>(null);

	const displayedTasks = $derived(sortTasks(filterTasks(tasksFn(), filterPriority, filterDue), sortKey));
	const hasActiveFilters = $derived(filterPriority !== null || filterDue !== null);
	const activeFilterCount = $derived((filterPriority !== null ? 1 : 0) + (filterDue !== null ? 1 : 0));

	return {
		get sortKeys() {
			return sortKeys;
		},
		get sortKey() {
			return sortKey;
		},
		set sortKey(v: SortKey) {
			sortKey = v;
		},
		get filterPriority() {
			return filterPriority;
		},
		set filterPriority(v: number | null) {
			filterPriority = v;
		},
		get filterDue() {
			return filterDue;
		},
		set filterDue(v: DueFilter) {
			filterDue = v;
		},
		get displayedTasks() {
			return displayedTasks;
		},
		get hasActiveFilters() {
			return hasActiveFilters;
		},
		get activeFilterCount() {
			return activeFilterCount;
		},
		clearFilters() {
			filterPriority = null;
			filterDue = null;
		}
	};
}

export type SortFilterState = ReturnType<typeof createSortFilterState>;
