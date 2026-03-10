<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import type { Task } from '$lib/types/index.js';
  import { getPriorityLabel } from '$lib/utils/design-tokens.js';

  let {
    task,
    onselect,
  }: {
    task: Task;
    onselect: (task: Task) => void;
  } = $props();

  let toggling = $state(false);

  function formatDueDate(due_at: string | null): string | null {
    if (!due_at) return null;
    const date = new Date(due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function isOverdue(due_at: string | null, status: string): boolean {
    if (!due_at || status === 'done' || status === 'canceled') return false;
    return new Date(due_at) < new Date();
  }
</script>

<div class="flex items-center gap-3 rounded-md border bg-surface p-3 hover:bg-surface-subtle transition-colors group">
  <!-- Toggle checkbox -->
  <form
    method="POST"
    action="?/toggleTask"
    use:enhance={() => {
      toggling = true;
      return async ({ result, update }) => {
        toggling = false;
        if (result.type === 'success') {
          toast.success(task.status === 'done' ? 'Task reopened' : 'Task completed');
        }
        await update();
      };
    }}
  >
    <input type="hidden" name="id" value={task.id} />
    <input type="hidden" name="current_status" value={task.status} />
    <button
      type="submit"
      class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
        {task.status === 'done' ? 'bg-primary border-primary' : 'border-foreground-muted hover:border-primary'}
        {toggling ? 'opacity-50' : ''}"
      disabled={toggling}
      aria-label={task.status === 'done' ? 'Reopen task' : 'Complete task'}
    >
      {#if task.status === 'done'}
        <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 6l3 3 5-5" />
        </svg>
      {/if}
    </button>
  </form>

  <!-- Task content (clickable to open detail) -->
  <button
    type="button"
    class="flex-1 text-left min-w-0"
    onclick={() => onselect(task)}
  >
    <div class="flex items-center gap-2">
      <span class="truncate {task.status === 'done' ? 'line-through text-foreground-muted' : ''}">{task.title}</span>
      {#if task.priority < 4}
        <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-subtle text-foreground-secondary flex-shrink-0">
          {getPriorityLabel(task.priority)}
        </span>
      {/if}
    </div>
    {#if task.due_at}
      <span class="text-xs mt-0.5 block {isOverdue(task.due_at, task.status) ? 'text-destructive' : 'text-foreground-secondary'}">
        {formatDueDate(task.due_at)}
      </span>
    {/if}
  </button>
</div>
