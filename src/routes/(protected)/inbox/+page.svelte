<script lang="ts">
  import type { PageData } from './$types';
  import type { Task } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SortFilterAccordion from '$lib/components/SortFilterAccordion.svelte';
  import { createSortFilterState } from '$lib/stores/sort-filter.svelte.js';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { CalendarDays } from '@lucide/svelte';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);

  let activeTasks = $derived(data.tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled'));

  const sf = createSortFilterState(() => activeTasks);

  function openTask(task: Task) {
    selectedTask = task;
    sheetOpen = true;
  }
</script>

<div>
  <h1 class="text-page-title font-accent page-title-accent mb-8">Inbox</h1>

  <SortFilterAccordion filters={sf}>
    {#snippet extraControls()}
      <a
        href="/calendar"
        class="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-border text-foreground-secondary hover:border-foreground hover:text-foreground transition-colors"
        aria-label="Open calendar view"
      >
        <CalendarDays class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Calendar</span>
      </a>
    {/snippet}
  </SortFilterAccordion>

  {#if activeTasks.length === 0}
    <EmptyState title="Nothing waiting for you." subtitle="Your inbox is clear. Add a task to get started.">
      {#snippet illustration()}
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <!-- Tray body -->
          <rect x="6" y="28" width="40" height="18" rx="3" fill="hsl(17 97% 93%)" stroke="hsl(17 91% 40%)" stroke-width="1.8"/>
          <!-- Tray opening curve -->
          <path d="M6 28 Q6 20 14 20 H22 Q26 20 26 24 Q26 20 30 20 H38 Q46 20 46 28" fill="hsl(17 97% 93%)" stroke="hsl(17 91% 40%)" stroke-width="1.8"/>
          <!-- Floating checkmark circle -->
          <circle cx="36" cy="14" r="9" fill="hsl(17 91% 40%)"/>
          <path d="M31.5 14l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/snippet}
      {#snippet action()}
        <button
          type="button"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          onclick={() => { (document.querySelector('#quick-add-title') as HTMLInputElement | null)?.focus(); }}
        >
          Add a task
        </button>
      {/snippet}
    </EmptyState>
  {:else if sf.displayedTasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks match the current filters.</p>
      <button onclick={() => sf.clearFilters()} class="mt-2 text-sm text-foreground-secondary hover:text-foreground underline underline-offset-2">
        Clear filters
      </button>
    </div>
  {:else}
    <div class="space-y-2">
      {#each sf.displayedTasks as task (task.id)}
        <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
          <TaskRow {task} onselect={openTask} userRole="owner" lists={data.lists} />
        </div>
      {/each}
    </div>
  {/if}

</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole="owner" />
