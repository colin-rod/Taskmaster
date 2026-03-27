<script lang="ts">
	import type { SortFilterState } from '$lib/stores/sort-filter.svelte.js';
	import type { Snippet } from 'svelte';
	import {
		SORT_LABELS,
		PRIORITY_LABELS,
		DUE_FILTERS,
		PRIORITY_ACTIVE_CLASSES,
		DUE_ACTIVE_CLASSES,
		type SortKey
	} from '$lib/utils/sort-filter.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { ChevronDown, SlidersHorizontal, X } from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	let { filters, extraControls }: { filters: SortFilterState; extraControls?: Snippet } = $props();

	let manualOpen = $state(false);
	let isOpen = $derived(filters.hasActiveFilters || manualOpen);

	let sortOpen = $state(false);

	function handleToggle() {
		if (filters.hasActiveFilters) {
			// When filters active, toggling clears them and collapses
			if (isOpen && manualOpen) {
				manualOpen = false;
			} else {
				manualOpen = !manualOpen;
			}
		} else {
			manualOpen = !manualOpen;
		}
	}
</script>

<div class="mb-4">
	<!-- Trigger bar -->
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground-secondary hover:border-foreground hover:text-foreground transition-colors cursor-pointer"
		onclick={handleToggle}
		aria-expanded={isOpen}
	>
		<SlidersHorizontal class="w-3.5 h-3.5" />
		<span class="font-medium">Sort & Filter</span>
		{#if filters.activeFilterCount > 0}
			<span class="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold w-4.5 h-4.5 leading-none">
				{filters.activeFilterCount}
			</span>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			{#if extraControls}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div onclick={(e: MouseEvent) => e.stopPropagation()}>
					{@render extraControls()}
				</div>
			{/if}
			<ChevronDown class="w-3.5 h-3.5 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
		</div>
	</button>

	<!-- Expandable content -->
	{#if isOpen}
		<div transition:slide={{ duration: 200 }} class="mt-2">
			<div class="flex flex-wrap items-center gap-3">
				<!-- Sort -->
				<Popover.Root bind:open={sortOpen}>
					<Popover.Trigger>
						<button
							type="button"
							class="text-xs px-2 py-2 min-h-11 rounded-md border border-border text-foreground-secondary hover:border-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
							aria-label="Sort tasks"
						>
							Sort: {SORT_LABELS[filters.sortKey]}
							<ChevronDown class="w-3 h-3" />
						</button>
					</Popover.Trigger>
					<Popover.Content class="w-52 p-1" align="start">
						{#each Object.entries(SORT_LABELS) as [key, label]}
							<button
								type="button"
								class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
									{filters.sortKey === key ? 'bg-surface-subtle font-medium' : ''}"
								onclick={() => { filters.sortKey = key as SortKey; sortOpen = false; }}
							>
								<span class="w-3.5 h-3.5 flex items-center justify-center text-primary text-xs">
									{#if filters.sortKey === key}✓{/if}
								</span>
								{label}
							</button>
						{/each}
					</Popover.Content>
				</Popover.Root>

				<!-- Priority filter pills -->
				<div class="flex items-center gap-1">
					{#each PRIORITY_LABELS as label, i}
						{@const val = i + 1}
						<button
							onclick={() => filters.filterPriority = filters.filterPriority === val ? null : val}
							class="text-xs px-2 py-2 min-h-11 rounded-md border transition-colors {filters.filterPriority === val
								? PRIORITY_ACTIVE_CLASSES[i]
								: 'border-border text-foreground-secondary hover:border-foreground hover:text-foreground'}"
						>
							{label}
						</button>
					{/each}
				</div>

				<!-- Due date filter pills -->
				<div class="flex items-center gap-1">
					{#each DUE_FILTERS as f}
						<button
							onclick={() => filters.filterDue = filters.filterDue === f.value ? null : f.value}
							class="text-xs px-2 py-2 min-h-11 rounded-md border transition-colors {filters.filterDue === f.value
								? DUE_ACTIVE_CLASSES[f.value ?? '']
								: 'border-border text-foreground-secondary hover:border-foreground hover:text-foreground'}"
						>
							{f.label}
						</button>
					{/each}
				</div>

				{#if filters.hasActiveFilters}
					<button
						onclick={() => filters.clearFilters()}
						class="p-1 rounded text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
						aria-label="Clear filters"
					>
						<X class="w-3.5 h-3.5" />
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
