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
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Assigned to Me</h1>

  {#if data.tasks.length === 0}
    <div class="text-center py-12">
      <p class="text-foreground-secondary">No tasks assigned to you.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each data.tasks as task (task.id)}
        <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
      {/each}
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
