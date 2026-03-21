<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidate, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Task, ListRole, Profile } from '$lib/types/index.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2, Ellipsis, Check, Bell } from '@lucide/svelte';
  import InlineEditTitle from '$lib/components/InlineEditTitle.svelte';
  import PriorityPicker from '$lib/components/PriorityPicker.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import TimePickerPopover from '$lib/components/TimePickerPopover.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';
  import { hasTime, formatDateOnly, formatTimeOnly } from '$lib/utils/dates.js';
  import { PRIORITY_OPTIONS, getDueDateClass } from '$lib/utils/design-tokens.js';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';

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

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

  let toggling = $state(false);
  let justCompleted = $state(false);
  let completedTimeout: ReturnType<typeof setTimeout>;
  let canEdit = $derived(userRole !== 'viewer');
  let optimisticStatus = $state('');
  $effect(() => { optimisticStatus = task.status; });

  let checklistTotal = $derived((task.checklist_items ?? []).length);
  let checklistDone = $derived((task.checklist_items ?? []).filter((i) => i.is_completed).length);
  let sortedChecklistItems = $derived(
    [...(task.checklist_items ?? [])].sort((a, b) => a.position - b.position)
  );

  let deleteForm = $state<HTMLFormElement | undefined>(undefined);
  let deleteAlertOpen = $state(false);
  let deleted = $state(false);

  async function patchTask(fields: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      toast.error('Change not saved — please try again.');
      return;
    }
    const affectsCounts = 'status' in fields;
    if (affectsCounts) {
      await invalidateAll();
    } else {
      await invalidate('app:tasks');
    }
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

  function deleteTaskFromContext() {
    deleteAlertOpen = true;
  }
</script>

{#if !deleted}
<div out:fly={{ y: -4, duration: motionDuration, easing: cubicOut }}>
<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="task-row-hover flex items-center gap-3 rounded-md border bg-surface px-4 py-4 group overflow-hidden"
        class:is-completing-row={justCompleted}
        ondblclick={() => onselect(task)}
        onkeydown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onselect(task); }}
      >
        <!-- Toggle checkbox -->
        {#if userRole === 'viewer'}
          <div
            class="w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0
              {task.status === 'done' ? 'bg-primary border-primary' : 'border-foreground-muted/60'}"
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
              const prevStatus = optimisticStatus;
              optimisticStatus = optimisticStatus === 'done' ? 'todo' : 'done';
              toggling = true;
              return async ({ result, update }) => {
                toggling = false;
                if (result.type === 'success') {
                  const data = result.data as Record<string, unknown> | undefined;
                  if (data?.rolled) {
                    toast.success('Repeated — next occurrence is set.');
                  } else {
                    toast.success(prevStatus === 'done' ? 'Back on the list.' : 'Done. One less thing.');
                    if (prevStatus !== 'done') {
                      justCompleted = true;
                      clearTimeout(completedTimeout);
                      completedTimeout = setTimeout(() => { justCompleted = false; }, 700);
                    }
                  }
                } else {
                  optimisticStatus = prevStatus;
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="current_status" value={task.status} />
            <button
              type="submit"
              class="w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all
                {optimisticStatus === 'done' ? 'bg-primary border-primary ring-2 ring-[hsl(var(--status-done)/0.2)]' : 'border-foreground-muted/60 hover:border-primary hover:scale-105'}
                {toggling ? 'opacity-50' : ''}"
              class:is-completing={justCompleted}
              disabled={toggling}
              aria-label={optimisticStatus === 'done' ? 'Reopen task' : 'Complete task'}
            >
              {#if optimisticStatus === 'done'}
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 6l3 3 5-5" stroke-dasharray="20" stroke-dashoffset="20" class:is-completing={justCompleted} />
                </svg>
              {/if}
            </button>
          </form>
        {/if}

        <!-- Task content — inline editable fields -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="flex-1 min-w-0 {optimisticStatus === 'done' ? (justCompleted ? 'task-done-title' : 'line-through') + ' text-foreground-muted/70 text-[14px]' : 'font-[510] text-[15px] text-foreground tracking-[-0.01em]'}">
              <InlineEditTitle taskId={task.id} value={task.title} disabled={!canEdit} />
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1 {optimisticStatus === 'done' ? 'opacity-60' : ''}">
            {#if canEdit}
              <DatePickerPopover taskId={task.id} value={task.due_at} />
              <TimePickerPopover taskId={task.id} value={task.due_at} />
            {:else if task.due_at}
              <span class="text-xs {getDueDateClass(task.due_at) || 'text-foreground-secondary'}">
                {formatDateOnly(task.due_at)}{hasTime(task.due_at) ? ', ' + formatTimeOnly(task.due_at) : ''}
              </span>
            {/if}
            {#if task.is_recurring}
              <span class="text-xs text-accent flex items-center gap-0.5 bg-accent/8 px-1.5 py-0.5 rounded-full" title={task.recurrence_rule ? describeRecurrence(task.recurrence_rule) : 'Recurring'}>
                <Repeat2 class="w-3 h-3" aria-hidden="true" />
                <span class="sr-only">Recurring</span>
              </span>
            {/if}
            {#if task.reminder_at}
              <span
                class="text-xs text-status-doing flex items-center gap-0.5 bg-status-doing/10 px-1.5 py-0.5 rounded-full"
                title={new Date(task.reminder_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              >
                <Bell class="w-3 h-3" />
              </span>
            {/if}
            {#if checklistTotal > 0}
              <Popover.Root>
                <Popover.Trigger openOnHover openDelay={300} closeDelay={150}>
                  <span
                    class="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-full cursor-default {checklistDone === checklistTotal ? 'bg-status-done/10 text-status-done' : 'bg-background text-foreground-muted/80 border border-border/50'}"
                    aria-label="Checklist: {checklistDone} of {checklistTotal} complete"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 8h10M3 4h10M3 12h10" />
                    </svg>
                    {checklistDone}/{checklistTotal}
                  </span>
                </Popover.Trigger>
                <Popover.Content class="w-56 p-2 space-y-1" align="start" side="top" sideOffset={6}>
                  {#each sortedChecklistItems as item (item.id)}
                    <div class="flex items-start gap-2 text-xs">
                      <div class="mt-0.5 w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center {item.is_completed ? 'bg-primary border-primary' : 'border-foreground-muted'}">
                        {#if item.is_completed}
                          <svg class="w-2 h-2 text-primary-foreground" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 4l2 2 4-4" />
                          </svg>
                        {/if}
                      </div>
                      <span class="{item.is_completed ? 'line-through text-foreground-muted' : 'text-foreground'}">
                        {item.label}
                      </span>
                    </div>
                  {/each}
                </Popover.Content>
              </Popover.Root>
            {/if}
            <AssigneePicker
              taskId={task.id}
              assignee={task.assignee}
              {members}
              disabled={!canEdit}
            />
          </div>
        </div>

        <!-- Priority badge -->
        {#if canEdit}
          <PriorityPicker taskId={task.id} value={task.priority} />
        {:else}
          {@const p = PRIORITY_OPTIONS.find(p => p.level === task.priority)}
          <span class="text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 {p?.bg ?? 'bg-surface-subtle'} {p?.color ?? 'text-foreground-muted'}" aria-label="Priority {p?.desc ?? task.priority}">
            P{task.priority}
          </span>
        {/if}

        <!-- More menu (opens TaskSheet) -->
        <button
          type="button"
          class="p-1.5 rounded-md text-transparent group-hover:text-foreground-muted hover:text-primary! hover:bg-primary/10 transition-all duration-150"
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
            <ContextMenu.Item onSelect={() => patchTask({ status: val })}>
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
          {#each [[1, 'P1 — Urgent'], [2, 'P2 — High'], [3, 'P3 — Medium'], [4, 'P4 — Low']] as [val, label]}
            <ContextMenu.Item onSelect={() => patchTask({ priority: val })}>
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
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(0) })}>Today</ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(1) })}>Tomorrow</ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(7) })}>Next week</ContextMenu.Item>
          {#if task.due_at}
            <ContextMenu.Item onSelect={() => patchTask({ due_at: null })}>Remove date</ContextMenu.Item>
          {/if}
          <div class="border-t mt-1 pt-1 px-2">
            <input
              type="date"
              aria-label="Custom due date"
              class="text-sm w-full bg-transparent outline-none py-1"
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
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: offsetFromDueAt(10) })}>10 min</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: offsetFromDueAt(60) })}>1 hr</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: offsetFromDueAt(1440) })}>1 day</ContextMenu.Item>
          {/if}
          {#if task.reminder_at}
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: null })}>Clear reminder</ContextMenu.Item>
          {/if}
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <ContextMenu.Separator />

      <ContextMenu.Item class="text-destructive focus:text-destructive" onSelect={deleteTaskFromContext}>
        Delete Task
      </ContextMenu.Item>
    </ContextMenu.Content>
  {/if}
</ContextMenu.Root>
</div>

<!-- Hidden delete form -->
{#if canEdit}
  <form bind:this={deleteForm} method="POST" action="?/deleteTask" use:enhance={() => {
    deleted = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        toast.success('Task deleted');
      } else {
        deleted = false;
      }
      await update();
    };
  }}>
    <input type="hidden" name="id" value={task.id} />
  </form>
{/if}

<!-- Delete confirmation dialog -->
<AlertDialog.Root bind:open={deleteAlertOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete this task?</AlertDialog.Title>
      <AlertDialog.Description>This task will be permanently deleted and cannot be recovered.</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => deleteForm?.requestSubmit()}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
{/if}
