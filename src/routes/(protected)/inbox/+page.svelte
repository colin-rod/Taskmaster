<script lang="ts">
  import type { PageData } from './$types';
  import type { Task } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import CompletedTasksSection from '$lib/components/CompletedTasksSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { ChevronDown, X } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);

  type SortKey = 'created_desc' | 'created_asc' | 'due_asc' | 'due_desc' | 'priority_asc' | 'priority_desc';
  type DueFilter = 'overdue' | 'today' | 'no_date' | null;

  let sortKey = $state<SortKey>('created_desc');
  let filterPriority = $state<number | null>(null);
  let filterDue = $state<DueFilter>(null);

  let activeTasks = $derived(data.tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let completedTasks = $derived(data.tasks.filter((t) => t.status === 'done' || t.status === 'canceled'));

  const todayStartMs = $derived.by(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const todayEndMs = $derived.by(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); });

  const displayedTasks = $derived.by(() => {
    let tasks = [...activeTasks];

    if (filterPriority !== null)
      tasks = tasks.filter(t => t.priority === filterPriority);

    if (filterDue === 'overdue')
      tasks = tasks.filter(t => t.due_at && new Date(t.due_at).getTime() < todayStartMs);
    else if (filterDue === 'today')
      tasks = tasks.filter(t => { if (!t.due_at) return false; const ms = new Date(t.due_at).getTime(); return ms >= todayStartMs && ms <= todayEndMs; });
    else if (filterDue === 'no_date')
      tasks = tasks.filter(t => !t.due_at);

    const withKeys = tasks.map(t => ({
      task: t,
      createdMs: t.created_at ? new Date(t.created_at).getTime() : 0,
      dueMs: t.due_at ? new Date(t.due_at).getTime() : Infinity,
    }));

    withKeys.sort((a, b) => {
      switch (sortKey) {
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

    return withKeys.map(w => w.task);
  });

  const hasActiveFilters = $derived(filterPriority !== null || filterDue !== null);

  function clearFilters() {
    filterPriority = null;
    filterDue = null;
  }

  function openTask(task: Task) {
    selectedTask = task;
    sheetOpen = true;
  }

  const priorityLabels = ['P1', 'P2', 'P3', 'P4'];
  const dueFilters: { value: DueFilter; label: string }[] = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'no_date', label: 'No date' },
  ];

  let sortOpen = $state(false);

  const sortLabels: Record<SortKey, string> = {
    created_desc: 'Created (newest)',
    created_asc: 'Created (oldest)',
    due_asc: 'Due date (earliest)',
    due_desc: 'Due date (latest)',
    priority_asc: 'Priority (highest)',
    priority_desc: 'Priority (lowest)',
  };

  const priorityActiveClasses = [
    'bg-red-50 text-red-700 border-red-200',
    'bg-orange-50 text-orange-600 border-orange-200',
    'bg-blue-50 text-blue-600 border-blue-200',
    'bg-surface-subtle text-foreground-secondary border-border',
  ];

  const dueActiveClasses: Record<string, string> = {
    overdue: 'bg-red-50 text-red-700 border-red-200',
    today: 'bg-primary-tint text-primary border-primary',
    no_date: 'bg-surface-subtle text-foreground-secondary border-border',
  };
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Inbox</h1>

  <!-- Controls bar -->
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <!-- Sort -->
    <Popover.Root bind:open={sortOpen}>
      <Popover.Trigger>
        <button
          type="button"
          class="text-xs px-2 py-2 min-h-11 rounded-md border border-border text-foreground-secondary hover:border-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
          aria-label="Sort tasks"
        >
          Sort: {sortLabels[sortKey]}
          <ChevronDown class="w-3 h-3" />
        </button>
      </Popover.Trigger>
      <Popover.Content class="w-52 p-1" align="start">
        {#each Object.entries(sortLabels) as [key, label]}
          <button
            type="button"
            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
              {sortKey === key ? 'bg-surface-subtle font-medium' : ''}"
            onclick={() => { sortKey = key as SortKey; sortOpen = false; }}
          >
            <span class="w-3.5 h-3.5 flex items-center justify-center text-primary text-xs">
              {#if sortKey === key}✓{/if}
            </span>
            {label}
          </button>
        {/each}
      </Popover.Content>
    </Popover.Root>

    <!-- Priority filter pills -->
    <div class="flex items-center gap-1">
      {#each priorityLabels as label, i}
        {@const val = i + 1}
        <button
          onclick={() => filterPriority = filterPriority === val ? null : val}
          class="text-xs px-2 py-2 min-h-11 rounded-md border transition-colors {filterPriority === val
            ? priorityActiveClasses[i]
            : 'border-border text-foreground-secondary hover:border-foreground hover:text-foreground'}"
        >
          {label}
        </button>
      {/each}
    </div>

    <!-- Due date filter pills -->
    <div class="flex items-center gap-1">
      {#each dueFilters as f}
        <button
          onclick={() => filterDue = filterDue === f.value ? null : f.value}
          class="text-xs px-2 py-2 min-h-11 rounded-md border transition-colors {filterDue === f.value
            ? dueActiveClasses[f.value ?? '']
            : 'border-border text-foreground-secondary hover:border-foreground hover:text-foreground'}"
        >
          {f.label}
        </button>
      {/each}
    </div>

    {#if hasActiveFilters}
      <button
        onclick={clearFilters}
        class="ml-auto p-1 rounded text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label="Clear filters"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  {#if activeTasks.length === 0 && completedTasks.length === 0}
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
  {:else if displayedTasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks match the current filters.</p>
      <button onclick={clearFilters} class="mt-2 text-sm text-foreground-secondary hover:text-foreground underline underline-offset-2">
        Clear filters
      </button>
    </div>
  {:else}
    <div class="space-y-2">
      {#each displayedTasks as task (task.id)}
        <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
          <TaskRow {task} onselect={openTask} userRole="owner" />
        </div>
      {/each}
    </div>
  {/if}

  <CompletedTasksSection tasks={completedTasks} {openTask} />
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole="owner" />
