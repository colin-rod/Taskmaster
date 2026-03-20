<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import CompletedTasksSection from '$lib/components/CompletedTasksSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

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
</script>

<div>
  <h1 class="text-page-title font-accent page-title-accent mb-8">
    Overdue{#if activeTasks.length > 0}<span class="text-destructive"> ({activeTasks.length})</span>{/if}
  </h1>

  {#if activeTasks.length === 0 && completedTasks.length === 0}
    <EmptyState title="All caught up." subtitle="No overdue tasks. Keep it that way.">
      {#snippet illustration()}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="hsl(17 97% 93%)" stroke="hsl(17 91% 40%)" stroke-width="1.8"/>
          <path d="M14 24l7 7 13-13" stroke="hsl(17 91% 40%)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/snippet}
    </EmptyState>
  {:else}
    <div class="space-y-2">
      {#each activeTasks as task (task.id)}
        <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
          <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
        </div>
      {/each}
    </div>
  {/if}

  <CompletedTasksSection tasks={completedTasks} {openTask} taskRoleFn={taskRole} />
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
