<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';

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

  let upcomingGroups = $derived(groupByDay(data.upcoming));
  let hasTodayTasks = $derived(data.overdue.length > 0 || data.dueToday.length > 0);
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Today</h1>

  {#if !hasTodayTasks && upcomingGroups.length === 0}
    <div class="text-center py-12">
      <p class="text-foreground-secondary">No tasks due today. You're all caught up!</p>
    </div>
  {/if}

  {#if data.overdue.length > 0}
    <div class="mb-6">
      <h2 class="text-section-header font-accent mb-3 text-destructive">Overdue</h2>
      <div class="space-y-2">
        {#each data.overdue as task (task.id)}
          <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
        {/each}
      </div>
    </div>
  {/if}

  {#if data.dueToday.length > 0}
    <div class="mb-6">
      <h2 class="text-section-header font-accent mb-3">Due Today</h2>
      <div class="space-y-2">
        {#each data.dueToday as task (task.id)}
          <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
        {/each}
      </div>
    </div>
  {/if}

  <!-- Quick add -->
  <div class="mb-6">
    <QuickAdd />
  </div>

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
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
