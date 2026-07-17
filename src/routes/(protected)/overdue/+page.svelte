<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import SmartViewShell from '$lib/components/SmartViewShell.svelte';
  import CompletedTasksSection from '$lib/components/CompletedTasksSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SortFilterAccordion from '$lib/components/SortFilterAccordion.svelte';
  import { createSortFilterState } from '$lib/stores/sort-filter.svelte.js';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

  let { data }: { data: PageData } = $props();

  let activeTasks = $derived(data.tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let completedTasks = $derived(data.tasks.filter((t) => t.status === 'done' || t.status === 'canceled'));

  const sf = createSortFilterState(() => activeTasks);
</script>

<SmartViewShell title="Overdue" roleMap={data.roleMap}>
  {#snippet body({ openTask, taskRole }: { openTask: (task: Task) => void; taskRole: (task: Task) => ListRole })}
    {#if activeTasks.length > 0}
      <SortFilterAccordion filters={sf} />
    {/if}

    {#if activeTasks.length === 0 && completedTasks.length === 0}
      <EmptyState title="All caught up." subtitle="No overdue tasks. Keep it that way.">
        {#snippet illustration()}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" fill="hsl(var(--primary-tint))" stroke="hsl(var(--primary))" stroke-width="1.8"/>
            <path d="M14 24l7 7 13-13" stroke="hsl(var(--primary))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="space-y-2">
        {#each sf.displayedTasks as task (task.id)}
          <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
            <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
          </div>
        {/each}
      </div>
    {/if}

    <CompletedTasksSection tasks={completedTasks} {openTask} taskRoleFn={taskRole} />
  {/snippet}
</SmartViewShell>
