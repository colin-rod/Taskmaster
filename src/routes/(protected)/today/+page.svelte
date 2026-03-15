<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import CompletedTasksSection from '$lib/components/CompletedTasksSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import TaskListSection from '$lib/components/TaskListSection.svelte';
  import { groupByDay } from '$lib/utils/tasks.js';

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

  let activeOverdue = $derived(data.overdue.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let activeDueToday = $derived(data.dueToday.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let activeUpcoming = $derived(data.upcoming.filter((t) => t.status !== 'done' && t.status !== 'canceled'));

  let completedTasks = $derived([
    ...data.overdue.filter((t) => t.status === 'done' || t.status === 'canceled'),
    ...data.dueToday.filter((t) => t.status === 'done' || t.status === 'canceled'),
    ...data.upcoming.filter((t) => t.status === 'done' || t.status === 'canceled'),
  ]);

  let upcomingGroups = $derived(groupByDay(activeUpcoming));
  let hasTodayTasks = $derived(activeOverdue.length > 0 || activeDueToday.length > 0);
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Today</h1>

  {#if !hasTodayTasks && upcomingGroups.length === 0 && completedTasks.length === 0}
    <EmptyState title="Clear skies ahead." subtitle="Nothing due today. A good time to plan ahead.">
      {#snippet illustration()}
        <div class="relative w-20 h-20 flex items-center justify-center">
          <div
            class="absolute w-16 h-16 rounded-full"
            style="background: hsl(17 97% 93%); animation: sun-pulse 3s ease-in-out infinite;"
          ></div>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="relative z-10">
            <line x1="24" y1="3" x2="24" y2="9" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="24" y1="39" x2="24" y2="45" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="3" y1="24" x2="9" y2="24" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="39" y1="24" x2="45" y2="24" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="8.4" y1="8.4" x2="12.6" y2="12.6" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="35.4" y1="35.4" x2="39.6" y2="39.6" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="39.6" y1="8.4" x2="35.4" y2="12.6" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="12.6" y1="35.4" x2="8.4" y2="39.6" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="24" cy="24" r="9" fill="hsl(17 91% 40%)"/>
          </svg>
        </div>
      {/snippet}
    </EmptyState>
  {/if}

  {#if activeOverdue.length > 0}
    <TaskListSection label="Overdue" tasks={activeOverdue} {openTask} taskRoleFn={taskRole} variant="destructive" />
  {/if}

  {#if activeDueToday.length > 0}
    <TaskListSection label="Due Today" tasks={activeDueToday} {openTask} taskRoleFn={taskRole} />
  {/if}

  <!-- Upcoming section (combined Home view) -->
  {#if upcomingGroups.length > 0}
    <div class="mt-2">
      <h2 class="text-section-header font-accent mb-3 text-foreground-secondary">Coming Up</h2>
      {#each upcomingGroups as group (group.isoDate)}
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

  <CompletedTasksSection tasks={completedTasks} {openTask} taskRoleFn={taskRole} />
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
