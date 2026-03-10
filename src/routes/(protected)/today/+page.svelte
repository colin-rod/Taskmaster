<script lang="ts">
  import type { PageData } from './$types';
  import type { Task } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
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
  <h1 class="text-page-title font-accent mb-6">Today</h1>

  {#if data.overdue.length === 0 && data.dueToday.length === 0}
    <div class="text-center py-12">
      <p class="text-foreground-secondary">No tasks due today. You're all caught up!</p>
    </div>
  {/if}

  {#if data.overdue.length > 0}
    <div class="mb-6">
      <h2 class="text-section-header font-accent mb-3 text-destructive">Overdue</h2>
      <div class="space-y-2">
        {#each data.overdue as task (task.id)}
          <TaskRow {task} onselect={openTask} />
        {/each}
      </div>
    </div>
  {/if}

  {#if data.dueToday.length > 0}
    <div>
      <h2 class="text-section-header font-accent mb-3">Due Today</h2>
      <div class="space-y-2">
        {#each data.dueToday as task (task.id)}
          <TaskRow {task} onselect={openTask} />
        {/each}
      </div>
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} />
