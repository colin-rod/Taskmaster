<script lang="ts">
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import { ChevronDown } from '@lucide/svelte';

  let {
    tasks,
    openTask,
    taskRoleFn = () => 'owner' as ListRole,
  }: {
    tasks: Task[];
    openTask: (task: Task) => void;
    taskRoleFn?: (task: Task) => ListRole;
  } = $props();

  let showCompleted = $state(false);
</script>

{#if tasks.length > 0}
  <div class="mt-6">
    <button
      type="button"
      class="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition-colors"
      aria-expanded={showCompleted}
      onclick={() => { showCompleted = !showCompleted; }}
    >
      <ChevronDown class="w-3.5 h-3.5 transition-transform duration-200 {showCompleted ? 'rotate-180' : ''}" />
      {showCompleted ? 'Hide' : 'Show'} completed ({tasks.length})
    </button>
    {#if showCompleted}
      <div class="space-y-2 mt-2">
        {#each tasks as task (task.id)}
          <TaskRow {task} onselect={openTask} userRole={taskRoleFn(task)} />
        {/each}
      </div>
    {/if}
  </div>
{/if}
