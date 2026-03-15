<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let selectedTaskRole = $state<ListRole>('owner');
  let sheetOpen = $state(false);

  function taskRole(task: Task): ListRole {
    if (!task.list_id) return 'owner';
    return (data.roleMap[task.list_id] as ListRole) ?? 'owner';
  }

  function openTask(task: Task) {
    selectedTask = task;
    selectedTaskRole = taskRole(task);
    sheetOpen = true;
  }

  function groupByDay(tasks: Task[]): { label: string; date: string; tasks: Task[] }[] {
    const groups: Map<string, Task[]> = new Map();

    for (const task of tasks) {
      if (!task.due_at) continue;
      const dateKey = new Date(task.due_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const existing = groups.get(dateKey);
      if (existing) {
        existing.push(task);
      } else {
        groups.set(dateKey, [task]);
      }
    }

    return Array.from(groups.entries()).map(([label, tasks]) => ({
      label,
      date: tasks[0].due_at!,
      tasks,
    }));
  }

  let activeOverdue = $derived(data.overdue.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let activeDueToday = $derived(data.dueToday.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let activeUpcoming = $derived(data.upcoming.filter((t) => t.status !== 'done' && t.status !== 'canceled'));

  let completedTasks = $derived([
    ...data.overdue.filter((t) => t.status === 'done' || t.status === 'canceled'),
    ...data.dueToday.filter((t) => t.status === 'done' || t.status === 'canceled'),
    ...data.upcoming.filter((t) => t.status === 'done' || t.status === 'canceled'),
  ]);

  let showCompleted = $state(false);

  let upcomingGroups = $derived(groupByDay(activeUpcoming));
  let hasTodayTasks = $derived(activeOverdue.length > 0 || activeDueToday.length > 0);
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Today</h1>

  {#if !hasTodayTasks && upcomingGroups.length === 0 && completedTasks.length === 0}
    <div class="text-center py-12">
      <p class="text-foreground-secondary">No tasks due today. You're all caught up!</p>
    </div>
  {/if}

  {#if activeOverdue.length > 0}
    <div class="mb-6">
      <h2 class="text-section-header font-accent mb-3 text-destructive">Overdue</h2>
      <div class="space-y-2">
        {#each activeOverdue as task (task.id)}
          <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
        {/each}
      </div>
    </div>
  {/if}

  {#if activeDueToday.length > 0}
    <div class="mb-6">
      <h2 class="text-section-header font-accent mb-3">Due Today</h2>
      <div class="space-y-2">
        {#each activeDueToday as task (task.id)}
          <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
        {/each}
      </div>
    </div>
  {/if}

  <!-- Upcoming section (combined Home view) -->
  {#if upcomingGroups.length > 0}
    <div class="mt-2">
      <h2 class="text-section-header font-accent mb-3 text-foreground-secondary">Coming Up</h2>
      {#each upcomingGroups as group (group.date)}
        <div class="mb-4">
          <h3 class="text-sm font-medium text-foreground-muted mb-2">{group.label}</h3>
          <div class="space-y-2">
            {#each group.tasks as task (task.id)}
              <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if completedTasks.length > 0}
    <div class="mt-6">
      <button
        type="button"
        class="text-sm text-foreground-secondary hover:text-foreground"
        onclick={() => { showCompleted = !showCompleted; }}
      >
        {showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
      </button>
      {#if showCompleted}
        <div class="space-y-2 mt-2">
          {#each completedTasks as task (task.id)}
            <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
