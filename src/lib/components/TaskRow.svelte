<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import type { Task, ListRole, Profile } from '$lib/types/index.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2, Ellipsis } from '@lucide/svelte';
  import InlineEditTitle from '$lib/components/InlineEditTitle.svelte';
  import PriorityPicker from '$lib/components/PriorityPicker.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';

  let {
    task,
    onselect,
    userRole = 'owner' as ListRole,
    members = [],
  }: {
    task: Task;
    onselect: (task: Task) => void;
    userRole?: ListRole;
    members?: { user_id: string; profile?: Profile }[];
  } = $props();

  let toggling = $state(false);
  let canEdit = $derived(userRole !== 'viewer');

  let checklistTotal = $derived((task.checklist_items ?? []).length);
  let checklistDone = $derived((task.checklist_items ?? []).filter((i) => i.is_completed).length);
</script>

<div class="flex items-center gap-3 rounded-md border bg-surface p-3 hover:bg-surface-subtle transition-colors group">
  <!-- Toggle checkbox -->
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

  <!-- Task content — inline editable fields -->
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <span class="flex-1 min-w-0 {task.status === 'done' ? 'line-through text-foreground-muted' : ''}">
        <InlineEditTitle taskId={task.id} value={task.title} disabled={!canEdit} />
      </span>
      {#if canEdit}
        <PriorityPicker taskId={task.id} value={task.priority} />
      {:else if task.priority < 4}
        <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-subtle text-foreground-secondary flex-shrink-0">
          P{task.priority}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2 mt-0.5">
      {#if canEdit}
        <DatePickerPopover taskId={task.id} value={task.due_at} />
      {:else if task.due_at}
        <span class="text-xs text-foreground-secondary">
          {new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{task.due_at.endsWith('T12:00:00.000Z') ? '' : ', ' + new Date(task.due_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
      <AssigneePicker
        taskId={task.id}
        assignee={task.assignee}
        {members}
        disabled={!canEdit}
      />
    </div>
  </div>

  <!-- More menu (opens TaskSheet) -->
  <button
    type="button"
    class="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-subtle transition-colors
      md:opacity-0 md:group-hover:opacity-100"
    onclick={() => onselect(task)}
    aria-label="Task details"
  >
    <Ellipsis class="w-4 h-4" />
  </button>
</div>
