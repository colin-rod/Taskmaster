<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
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

  let activeTasks = $derived(data.tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let completedTasks = $derived(data.tasks.filter((t) => t.status === 'done' || t.status === 'canceled'));

  let dayGroups = $derived(groupByDay(activeTasks));
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Upcoming</h1>

  {#if dayGroups.length === 0 && completedTasks.length === 0}
    <EmptyState title="Nothing on the horizon." subtitle="The next 7 days are yours.">
      {#snippet illustration()}
        <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
          <rect x="4" y="8" width="44" height="34" rx="3" fill="hsl(17 97% 93%)" stroke="hsl(17 91% 40%)" stroke-width="1.8"/>
          <rect x="4" y="8" width="44" height="10" rx="3" fill="hsl(17 91% 40%)"/>
          <rect x="4" y="14" width="44" height="4" fill="hsl(17 91% 40%)"/>
          <line x1="16" y1="4" x2="16" y2="12" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="36" y1="4" x2="36" y2="12" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="10" y="24" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
          <rect x="22" y="24" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
          <rect x="34" y="24" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
          <rect x="10" y="33" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
          <rect x="22" y="33" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
          <rect x="34" y="33" width="8" height="6" rx="1.5" fill="hsl(17 91% 40%)" opacity="0.25"/>
        </svg>
      {/snippet}
    </EmptyState>
  {:else}
    {#each dayGroups as group (group.isoDate)}
      <TaskListSection label={group.label} tasks={group.tasks} {openTask} taskRoleFn={taskRole} />
    {/each}
  {/if}

  <CompletedTasksSection tasks={completedTasks} {openTask} taskRoleFn={taskRole} />
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
