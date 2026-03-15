<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import type { Task, ListRole, Profile } from '$lib/types/index.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2, Ellipsis, Check } from '@lucide/svelte';
  import InlineEditTitle from '$lib/components/InlineEditTitle.svelte';
  import PriorityPicker from '$lib/components/PriorityPicker.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';

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

  let deleteForm: HTMLFormElement;

  async function patchTask(fields: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      toast.error('Failed to update task');
      return;
    }
    await invalidateAll();
  }

  function quickDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  }

  function offsetFromDueAt(minutes: number): string | null {
    if (!task.due_at) return null;
    return new Date(new Date(task.due_at).getTime() - minutes * 60000).toISOString();
  }

  async function deleteTaskFromContext() {
    if (!window.confirm('Delete this task?')) return;
    deleteForm.requestSubmit();
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="flex items-center gap-3 rounded-md border bg-surface p-3 hover:bg-surface-subtle transition-colors group"
        ondblclick={() => onselect(task)}
      >
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
                {new Date(task.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{task.due_at.endsWith('T12:00:00.000Z') ? '' : ', ' + new Date(task.due_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
    {/snippet}
  </ContextMenu.Trigger>

  {#if canEdit}
    <ContextMenu.Content>
      <!-- Status -->
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger>Change Status</ContextMenu.SubTrigger>
        <ContextMenu.SubContent>
          {#each [['todo', 'Todo'], ['in_progress', 'In Progress'], ['done', 'Done'], ['canceled', 'Canceled']] as [val, label]}
            <ContextMenu.Item onselect={() => patchTask({ status: val })}>
              {#if task.status === val}
                <Check class="w-3 h-3 mr-2 shrink-0" />
              {:else}
                <span class="w-3 h-3 mr-2 shrink-0 inline-block"></span>
              {/if}
              {label}
            </ContextMenu.Item>
          {/each}
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <!-- Priority -->
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger>Change Priority</ContextMenu.SubTrigger>
        <ContextMenu.SubContent>
          {#each [[1, 'P1 Urgent'], [2, 'P2 High'], [3, 'P3 Medium'], [4, 'P4 Low']] as [val, label]}
            <ContextMenu.Item onselect={() => patchTask({ priority: val })}>
              {#if task.priority === val}
                <Check class="w-3 h-3 mr-2 shrink-0" />
              {:else}
                <span class="w-3 h-3 mr-2 shrink-0 inline-block"></span>
              {/if}
              {label}
            </ContextMenu.Item>
          {/each}
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <!-- Due Date -->
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger>Set Due Date</ContextMenu.SubTrigger>
        <ContextMenu.SubContent>
          <ContextMenu.Item onselect={() => patchTask({ due_at: quickDate(0) })}>Today</ContextMenu.Item>
          <ContextMenu.Item onselect={() => patchTask({ due_at: quickDate(1) })}>Tomorrow</ContextMenu.Item>
          <ContextMenu.Item onselect={() => patchTask({ due_at: quickDate(7) })}>Next week</ContextMenu.Item>
          {#if task.due_at}
            <ContextMenu.Item onselect={() => patchTask({ due_at: null })}>Remove date</ContextMenu.Item>
          {/if}
          <div class="border-t mt-1 pt-1 px-2">
            <input
              type="date"
              class="text-sm w-full bg-transparent outline-none py-1"
              onmousedown={(e) => e.stopPropagation()}
              onclick={(e) => e.stopPropagation()}
              onchange={(e) => {
                const val = e.currentTarget.value;
                if (val) patchTask({ due_at: new Date(val + 'T23:59:00').toISOString() });
              }}
            />
          </div>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <!-- Reminder -->
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger>Set Reminder</ContextMenu.SubTrigger>
        <ContextMenu.SubContent>
          {#if task.due_at}
            <ContextMenu.Item onselect={() => patchTask({ reminder_at: offsetFromDueAt(10) })}>10 min before</ContextMenu.Item>
            <ContextMenu.Item onselect={() => patchTask({ reminder_at: offsetFromDueAt(60) })}>1 hour before</ContextMenu.Item>
            <ContextMenu.Item onselect={() => patchTask({ reminder_at: offsetFromDueAt(1440) })}>1 day before</ContextMenu.Item>
          {/if}
          {#if task.reminder_at}
            <ContextMenu.Item onselect={() => patchTask({ reminder_at: null })}>Clear reminder</ContextMenu.Item>
          {/if}
          <div class="border-t mt-1 pt-1 px-2">
            <input
              type="datetime-local"
              class="text-sm w-full bg-transparent outline-none py-1"
              onmousedown={(e) => e.stopPropagation()}
              onclick={(e) => e.stopPropagation()}
              onchange={(e) => {
                const val = e.currentTarget.value;
                if (val) patchTask({ reminder_at: new Date(val).toISOString() });
              }}
            />
          </div>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <ContextMenu.Separator />

      <ContextMenu.Item class="text-destructive focus:text-destructive" onselect={deleteTaskFromContext}>
        Delete Task
      </ContextMenu.Item>
    </ContextMenu.Content>
  {/if}
</ContextMenu.Root>

<!-- Hidden delete form -->
<form bind:this={deleteForm} method="POST" action="?/deleteTask" use:enhance>
  <input type="hidden" name="id" value={task.id} />
</form>
