<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskSheet from '$lib/components/TaskSheet.svelte';

  let {
    title,
    count,
    roleMap = {},
    body,
  }: {
    title: string;
    /** Optional count shown in muted parentheses after the title. */
    count?: number;
    /** Map of list_id -> role, used to resolve per-task permissions. */
    roleMap?: Record<string, string>;
    /** Renders the view's list/grouping/empty-state. Receives the shared
        openTask + taskRole helpers so every view opens the same TaskSheet. */
    body: Snippet<[{ openTask: (task: Task) => void; taskRole: (task: Task) => ListRole }]>;
  } = $props();

  let selectedTask = $state<Task | null>(null);
  let selectedTaskRole = $state<ListRole>('owner');
  let sheetOpen = $state(false);

  function taskRole(task: Task): ListRole {
    if (!task.list_id) return 'owner';
    return (roleMap[task.list_id] as ListRole) ?? 'owner';
  }

  function openTask(task: Task) {
    selectedTask = task;
    selectedTaskRole = taskRole(task);
    sheetOpen = true;
  }
</script>

<div>
  <h1 class="text-page-title page-title-accent mb-8">
    {title}{#if count != null && count > 0}<span class="text-foreground-secondary"> ({count})</span>{/if}
  </h1>

  {@render body({ openTask, taskRole })}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
