<script lang="ts">
  import type { PageData } from './$types';
  import type { Task } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);

  function openTask(task: Task) {
    selectedTask = task;
    sheetOpen = true;
  }
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Inbox</h1>

  <div class="mb-4">
    <QuickAdd />
  </div>

  {#if data.tasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks in your inbox.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each data.tasks as task (task.id)}
        <TaskRow {task} onselect={openTask} userRole="owner" />
      {/each}
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole="owner" />
