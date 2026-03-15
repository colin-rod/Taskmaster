<script lang="ts">
  import type { PageData } from './$types';
  import type { Task } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);

  type SortKey = 'created_desc' | 'created_asc' | 'due_asc' | 'due_desc' | 'priority_asc' | 'priority_desc';
  type DueFilter = 'overdue' | 'today' | 'no_date' | null;

  let sortKey = $state<SortKey>('created_desc');
  let filterPriority = $state<number | null>(null);
  let filterDue = $state<DueFilter>(null);

  function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfToday(): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  const displayedTasks = $derived.by(() => {
    let tasks = [...data.tasks];

    if (filterPriority !== null)
      tasks = tasks.filter(t => t.priority === filterPriority);

    if (filterDue === 'overdue')
      tasks = tasks.filter(t => t.due_at && new Date(t.due_at) < startOfToday());
    else if (filterDue === 'today')
      tasks = tasks.filter(t => t.due_at && new Date(t.due_at) >= startOfToday() && new Date(t.due_at) <= endOfToday());
    else if (filterDue === 'no_date')
      tasks = tasks.filter(t => !t.due_at);

    tasks.sort((a, b) => {
      switch (sortKey) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'due_asc':
          if (!a.due_at && !b.due_at) return 0;
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        case 'due_desc':
          if (!a.due_at && !b.due_at) return 0;
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
        case 'priority_asc':
          return (a.priority ?? 4) - (b.priority ?? 4);
        case 'priority_desc':
          return (b.priority ?? 4) - (a.priority ?? 4);
        default:
          return 0;
      }
    });

    return tasks;
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
</script>

<div>
  <h1 class="text-page-title font-accent mb-4">Inbox</h1>

  <!-- Controls bar -->
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <!-- Sort -->
    <select
      bind:value={sortKey}
      class="text-sm rounded-md border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="created_desc">Created (newest)</option>
      <option value="created_asc">Created (oldest)</option>
      <option value="due_asc">Due date (earliest)</option>
      <option value="due_desc">Due date (latest)</option>
      <option value="priority_asc">Priority (highest)</option>
      <option value="priority_desc">Priority (lowest)</option>
    </select>

    <!-- Priority filter pills -->
    <div class="flex items-center gap-1">
      {#each priorityLabels as label, i}
        {@const val = i + 1}
        <button
          onclick={() => filterPriority = filterPriority === val ? null : val}
          class="text-xs px-2 py-1 rounded-md border transition-colors {filterPriority === val
            ? 'bg-foreground text-background border-foreground'
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
          class="text-xs px-2 py-1 rounded-md border transition-colors {filterDue === f.value
            ? 'bg-foreground text-background border-foreground'
            : 'border-border text-foreground-secondary hover:border-foreground hover:text-foreground'}"
        >
          {f.label}
        </button>
      {/each}
    </div>

    {#if hasActiveFilters}
      <button
        onclick={clearFilters}
        class="text-xs text-foreground-secondary hover:text-foreground underline underline-offset-2"
      >
        Clear filters
      </button>
    {/if}
  </div>

  {#if data.tasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks in your inbox.</p>
    </div>
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
        <TaskRow {task} onselect={openTask} userRole="owner" />
      {/each}
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole="owner" />
