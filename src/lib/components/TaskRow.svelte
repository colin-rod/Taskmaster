<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import type { Task, ListRole } from '$lib/types/index.js';
  import { getPriorityLabel } from '$lib/utils/design-tokens.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2 } from '@lucide/svelte';

  let {
    task,
    onselect,
    userRole = 'owner' as ListRole,
  }: {
    task: Task;
    onselect: (task: Task) => void;
    userRole?: ListRole;
  } = $props();

  let toggling = $state(false);

  let checklistTotal = $derived((task.checklist_items ?? []).length);
  let checklistDone = $derived((task.checklist_items ?? []).filter((i) => i.is_completed).length);

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
  <!-- Toggle checkbox (hidden for viewers) -->
  {#if userRole === 'viewer'}
    <div
      class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
        {task.status === 'done' ? 'bg-primary border-primary' : 'border-foreground-muted'}"
    >
      {#if task.status === 'done'}
        <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 6l3 3 5-5" />
        </svg>
      {/if}
    </div>
  {:else}
    <form
      method="POST"
      action="?/toggleTask"
      use:enhance={() => {
        toggling = true;
        return async ({ result, update }) => {
          toggling = false;
          if (result.type === 'success') {
            const data = result.data as Record<string, unknown> | undefined;
            if (data?.rolled) {
              toast.success('Recurring task rolled forward');
            } else {
              toast.success(task.status === 'done' ? 'Task reopened' : 'Task completed');
            }
          }
          await update();
        };
      }}
    >
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="current_status" value={task.status} />
      <button
        type="submit"
        class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
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
  {/if}

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
    <div class="flex items-center gap-2 mt-0.5">
      {#if task.due_at}
        <span class="text-xs {isOverdue(task.due_at, task.status) ? 'text-destructive' : 'text-foreground-secondary'}">
          {formatDueDate(task.due_at)}
        </span>
      {/if}
      {#if task.is_recurring}
        <span class="text-xs text-foreground-secondary flex items-center gap-0.5" title={task.recurrence_rule ? describeRecurrence(task.recurrence_rule) : 'Recurring'}>
          <Repeat2 class="w-3 h-3" />
        </span>
      {/if}
      {#if checklistTotal > 0}
        <span class="text-xs text-foreground-secondary flex items-center gap-1">
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 8h10M3 4h10M3 12h10" />
          </svg>
          {checklistDone}/{checklistTotal}
        </span>
      {/if}
      {#if task.assignee}
        <span class="text-xs text-foreground-secondary flex items-center gap-1">
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          {task.assignee.display_name ?? task.assignee.email}
        </span>
      {/if}
    </div>
  </button>
</div>
