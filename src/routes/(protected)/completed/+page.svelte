<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import SmartViewShell from '$lib/components/SmartViewShell.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SortFilterAccordion from '$lib/components/SortFilterAccordion.svelte';
  import { createSortFilterState } from '$lib/stores/sort-filter.svelte.js';
  import { COMPLETED_SORT_KEYS } from '$lib/utils/sort-filter.js';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

  let { data }: { data: PageData } = $props();

  // Server already orders by completed_at desc; keep that as the default sort.
  const sf = createSortFilterState(() => data.tasks, {
    defaultSort: 'completed_desc',
    sortKeys: COMPLETED_SORT_KEYS
  });
</script>

<SmartViewShell title="Completed" roleMap={data.roleMap}>
  {#snippet body({ openTask, taskRole }: { openTask: (task: Task) => void; taskRole: (task: Task) => ListRole })}
    {#if data.tasks.length > 0}
      <SortFilterAccordion filters={sf} />
    {/if}

    {#if data.tasks.length === 0}
      <EmptyState title="No completed tasks yet." subtitle="Tasks you finish will appear here.">
        {#snippet illustration()}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" fill="hsl(var(--primary-tint))" stroke="hsl(var(--primary))" stroke-width="1.8"/>
            <path d="M14 24l7 7 13-13" stroke="hsl(var(--primary))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/snippet}
      </EmptyState>
    {:else if sf.displayedTasks.length === 0}
      <EmptyState title="No matching tasks." subtitle="Try clearing or changing your filters." />
    {:else}
      <div class="space-y-2">
        {#each sf.displayedTasks as task (task.id)}
          <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
            <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
          </div>
        {/each}
      </div>
    {/if}
  {/snippet}
</SmartViewShell>
