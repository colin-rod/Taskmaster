<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidate, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Task, ListRole, Profile, Label, TaskList } from '$lib/types/index.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2, Ellipsis, Check, Bell, CircleDot, BarChart2 } from '@lucide/svelte';
  import LabelBadge from '$lib/components/LabelBadge.svelte';
  import LabelPicker from '$lib/components/LabelPicker.svelte';
  import InlineEditTitle from '$lib/components/InlineEditTitle.svelte';
  import PriorityPicker from '$lib/components/PriorityPicker.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';
  import { formatDateOnly } from '$lib/utils/dates.js';
  import { PRIORITY_OPTIONS, getDueDateClass } from '$lib/utils/design-tokens.js';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';

  let {
    task,
    onselect,
    userRole = 'owner' as ListRole,
    members = [],
    listLabels = [],
    lists = [],
  }: {
    task: Task;
    onselect: (task: Task) => void;
    userRole?: ListRole;
    members?: { user_id: string; profile?: Profile }[];
    listLabels?: Label[];
    lists?: TaskList[];
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
  // Optimistic checklist state for inline toggling
  let optimisticChecklist = $state<Record<string, boolean>>({});
  $effect(() => {
    optimisticChecklist = Object.fromEntries(
      (task.checklist_items ?? []).map((i) => [i.id, i.is_completed])
    );
  });

  let deleteForm = $state<HTMLFormElement | undefined>(undefined);
  let deleteAlertOpen = $state(false);
  let deleted = $state(false);
  let progressPopoverOpen = $state(false);
  let progressInputValue = $state(0);
  let reminderPopoverOpen = $state(false);
  let labelPickerOpen = $state(false);

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
    const affectsCounts = 'status' in fields || 'list_id' in fields;
    if (affectsCounts) {
      await invalidateAll();
    } else {
      await invalidate('app:tasks');
    }
  }

  function quickDate(daysFromNow: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  function deleteTaskFromContext() {
    deleteAlertOpen = true;
  }

  async function toggleLabel(labelId: string) {
    const attached = (task.labels ?? []).some((l) => l.id === labelId);
    const res = await fetch(`/api/tasks/${task.id}/labels`, {
      method: attached ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_id: labelId }),
    });
    if (!res.ok) {
      toast.error('Failed to update labels');
      return;
    }
    await invalidateAll();
  }
</script>

{#if !deleted}
<div out:fly={{ y: -4, duration: motionDuration, easing: cubicOut }}>
<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="task-row-hover flex items-center gap-3 rounded-md border bg-surface px-4 py-2.5 group overflow-hidden"
        class:is-completing-row={justCompleted}
        class:task-row-in-progress={optimisticStatus === 'in_progress'}
        tabindex="0"
        role="button"
        ondblclick={() => onselect(task)}
        onkeydown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onselect(task); }}
      >
        <!-- Toggle checkbox -->
        {#if userRole === 'viewer'}
          <div
            class="w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0
              {task.status === 'done' ? 'bg-primary border-primary' : task.status === 'in_progress' ? 'border-status-doing' : 'border-foreground-muted/60'}"
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
                {optimisticStatus === 'done' ? 'bg-primary border-primary ring-2 ring-[hsl(var(--status-done)/0.2)]' : optimisticStatus === 'in_progress' ? 'border-status-doing hover:border-primary hover:scale-105' : 'border-foreground-muted/60 hover:border-primary hover:scale-105'}
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
            <!-- Labels — badges open the picker for editors, static for viewers -->
            {#if canEdit}
              <div class="relative flex items-center">
                <!-- Visible label badges / hint — clicking opens the picker -->
                <button
                  type="button"
                  class="flex items-center gap-1 rounded hover:opacity-80 transition-opacity"
                  onclick={(e) => { e.stopPropagation(); labelPickerOpen = true; }}
                  aria-label="Edit labels"
                >
                  {#if task.labels?.length}
                    {#each task.labels.slice(0, 3) as label (label.id)}
                      <LabelBadge {label} size="sm" />
                    {/each}
                    {#if task.labels.length > 3}
                      <span class="text-[10px] text-foreground-muted">+{task.labels.length - 3}</span>
                    {/if}
                  {:else}
                    <span class="text-[10px] text-transparent group-hover:text-foreground-muted/40 transition-colors px-0.5">+ label</span>
                  {/if}
                </button>
                <!-- LabelPicker anchors its popover here; its own trigger is hidden -->
                <span class="absolute inset-0 pointer-events-none opacity-0" aria-hidden="true">
                  <LabelPicker
                    taskId={task.id}
                    listId={task.list_id}
                    currentLabels={task.labels ?? []}
                    bind:open={labelPickerOpen}
                    disabled={false}
                  />
                </span>
              </div>
            {:else if task.labels?.length}
              {#each task.labels.slice(0, 3) as label (label.id)}
                <LabelBadge {label} size="sm" />
              {/each}
              {#if task.labels.length > 3}
                <span class="text-[10px] text-foreground-muted">+{task.labels.length - 3}</span>
              {/if}
            {/if}
          </div>
          <div class="flex items-center gap-2 mt-1 {optimisticStatus === 'done' ? 'opacity-60' : ''}">
            {#if optimisticStatus === 'in_progress'}
              <span
                class="text-xs text-status-doing flex items-center gap-1 px-1 py-0.5 rounded-full"
                aria-label="In progress"
                title="In progress"
              >
                <CircleDot class="w-3 h-3" aria-hidden="true" />
              </span>
            {/if}
            {#if canEdit}
              <DatePickerPopover taskId={task.id} value={task.due_at} />
            {:else if task.due_at}
              <span class="text-xs {getDueDateClass(task.due_at) || 'text-foreground-secondary'}">
                {formatDateOnly(task.due_at)}
              </span>
            {/if}
            {#if task.is_recurring}
              <span class="text-xs text-accent flex items-center gap-1 px-1 py-0.5 rounded-full" title={task.recurrence_rule ? describeRecurrence(task.recurrence_rule) : 'Recurring'}>
                <Repeat2 class="w-3 h-3" aria-hidden="true" />
                <span class="sr-only">Recurring</span>
              </span>
            {/if}

            <!-- Reminder bell — clickable popover for editors -->
            {#if canEdit}
              <Popover.Root bind:open={reminderPopoverOpen}>
                <Popover.Trigger>
                  <button
                    type="button"
                    onclick={(e) => { e.stopPropagation(); reminderPopoverOpen = true; }}
                    class="text-xs flex items-center gap-1 px-1 py-0.5 rounded-full transition-colors
                      {task.reminder_at
                        ? 'text-status-doing'
                        : 'text-transparent group-hover:text-foreground-muted/40 hover:text-foreground-muted!'}"
                    aria-label={task.reminder_at ? 'Edit reminder' : 'Set reminder'}
                    title={task.reminder_at
                      ? formatDateOnly(task.reminder_at)
                      : 'Set reminder'}
                  >
                    <Bell class="w-3 h-3" aria-hidden="true" />
                  </button>
                </Popover.Trigger>
                <Popover.Content class="w-52 p-3 space-y-2" align="start" side="top" sideOffset={6}>
                  <p class="text-xs font-medium text-foreground-muted">Reminder</p>
                  <input
                    type="date"
                    aria-label="Reminder date"
                    class="w-full text-xs rounded border border-border bg-surface px-2 py-1 outline-none focus:border-primary/60"
                    value={task.reminder_at ? task.reminder_at.slice(0, 10) : ''}
                    onclick={(e) => e.stopPropagation()}
                    onchange={(e) => {
                      const dateVal = e.currentTarget.value;
                      if (!dateVal) return;
                      patchTask({ reminder_at: `${dateVal}T00:00:00.000Z` });
                    }}
                  />
                  {#if task.reminder_at}
                    <button
                      type="button"
                      class="w-full text-xs text-destructive hover:text-destructive/80 text-left pt-1 border-t border-border"
                      onclick={(e) => {
                        e.stopPropagation();
                        reminderPopoverOpen = false;
                        patchTask({ reminder_at: null });
                      }}
                    >Clear reminder</button>
                  {/if}
                </Popover.Content>
              </Popover.Root>
            {:else if task.reminder_at}
              <span
                class="text-xs text-status-doing flex items-center gap-1 px-1 py-0.5 rounded-full"
                aria-label="Reminder set"
                title={formatDateOnly(task.reminder_at)}
              >
                <Bell class="w-3 h-3" aria-hidden="true" />
              </span>
            {/if}

            <!-- Checklist badge — interactive popover -->
            {#if checklistTotal > 0}
              <Popover.Root>
                <Popover.Trigger>
                  <button
                    type="button"
                    class="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-full cursor-pointer {checklistDone === checklistTotal ? 'bg-status-done/10 text-status-done' : 'bg-background text-foreground-muted/80 border border-border/50'}"
                    aria-label="Checklist: {checklistDone} of {checklistTotal} complete"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 8h10M3 4h10M3 12h10" />
                    </svg>
                    {checklistDone}/{checklistTotal}
                  </button>
                </Popover.Trigger>
                <Popover.Content class="w-60 p-2 space-y-1" align="start" side="top" sideOffset={6}>
                  {#each sortedChecklistItems as item (item.id)}
                    {#if canEdit}
                      <form
                        method="POST"
                        action="?/toggleChecklistItem"
                        use:enhance={() => {
                          const prev = optimisticChecklist[item.id];
                          optimisticChecklist[item.id] = !prev;
                          return async ({ result, update }) => {
                            if (result.type !== 'success') {
                              optimisticChecklist[item.id] = prev;
                            }
                            await update();
                          };
                        }}
                      >
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="task_id" value={task.id} />
                        <input type="hidden" name="is_completed" value={String(optimisticChecklist[item.id] ?? item.is_completed)} />
                        <button
                          type="submit"
                          class="flex items-start gap-2 text-xs w-full text-left hover:bg-surface-subtle rounded px-1 py-0.5 transition-colors"
                          onclick={(e) => e.stopPropagation()}
                        >
                          <div class="mt-0.5 w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center {(optimisticChecklist[item.id] ?? item.is_completed) ? 'bg-primary border-primary' : 'border-foreground-muted'}">
                            {#if optimisticChecklist[item.id] ?? item.is_completed}
                              <svg class="w-2 h-2 text-primary-foreground" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 4l2 2 4-4" />
                              </svg>
                            {/if}
                          </div>
                          <span class="{(optimisticChecklist[item.id] ?? item.is_completed) ? 'line-through text-foreground-muted' : 'text-foreground'}">
                            {item.label}
                          </span>
                        </button>
                      </form>
                    {:else}
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
                    {/if}
                  {/each}
                </Popover.Content>
              </Popover.Root>
            {/if}

            {#if task.progress_total != null}
              <Popover.Root bind:open={progressPopoverOpen}>
                <Popover.Trigger>
                  <button
                    type="button"
                    onclick={() => { progressInputValue = task.progress_current ?? 0; progressPopoverOpen = true; }}
                    class="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-full cursor-pointer {(task.progress_current ?? 0) >= task.progress_total! && task.progress_total! > 0 ? 'bg-status-done/10 text-status-done' : 'bg-background text-foreground-muted/80 border border-border/50'}"
                    aria-label="Progress: {task.progress_current ?? 0} of {task.progress_total}"
                  >
                    <BarChart2 class="w-3 h-3" aria-hidden="true" />
                    {task.progress_current ?? 0}/{task.progress_total}
                  </button>
                </Popover.Trigger>
                <Popover.Content class="w-52 p-3" align="start" side="top" sideOffset={6}>
                  <p class="text-xs text-foreground-muted mb-2">Update progress (total: {task.progress_total})</p>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      bind:value={progressInputValue}
                      class="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary/60"
                      onclick={(e) => e.stopPropagation()}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') {
                          progressPopoverOpen = false;
                          patchTask({ progress_current: Math.max(0, progressInputValue) });
                        }
                      }}
                    />
                    <button
                      type="button"
                      class="text-xs font-medium text-primary hover:text-primary-hover"
                      onclick={(e) => {
                        e.stopPropagation();
                        progressPopoverOpen = false;
                        patchTask({ progress_current: Math.max(0, progressInputValue) });
                      }}
                    >Save</button>
                  </div>
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
          {#if task.progress_total != null && task.progress_total > 0}
            {@const pct = Math.min(100, Math.round(((task.progress_current ?? 0) / task.progress_total) * 100))}
            <div class="mt-1.5 h-1 w-full rounded-full bg-border/40 overflow-hidden">
              <div class="h-full rounded-full bg-primary/60 transition-all duration-300" style="width: {pct}%"></div>
            </div>
          {/if}
        </div>

        <!-- Priority badge -->
        {#if canEdit}
          <PriorityPicker taskId={task.id} value={task.priority} />
        {:else}
          {@const p = PRIORITY_OPTIONS.find(p => p.level === task.priority)}
          <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 {p?.bg ?? 'bg-surface-subtle'} {p?.color ?? 'text-foreground-muted'}" aria-label="Priority {p?.desc ?? task.priority}">
            <span class="inline-block w-1.5 h-1.5 rounded-full {p?.dot ?? 'bg-foreground-disabled'}"></span>
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
      <ContextMenu.Item onSelect={() => onselect(task)}>Open details</ContextMenu.Item>
      <ContextMenu.Separator />
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
                if (val) patchTask({ due_at: `${val}T00:00:00.000Z` });
              }}
            />
          </div>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <!-- Reminder (only show when task has a due date) -->
      {#if task.due_at}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Set Reminder</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: quickDate(0) })}>Today</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: quickDate(1) })}>Tomorrow</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ reminder_at: quickDate(7) })}>Next week</ContextMenu.Item>
            {#if task.reminder_at}
              <ContextMenu.Item onSelect={() => patchTask({ reminder_at: null })}>Clear reminder</ContextMenu.Item>
            {/if}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

      <!-- Labels -->
      {#if listLabels.length > 0}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Labels</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            {#each listLabels as label (label.id)}
              <ContextMenu.Item onSelect={() => toggleLabel(label.id)}>
                {#if (task.labels ?? []).some((l) => l.id === label.id)}
                  <Check class="w-3 h-3 mr-2 shrink-0" />
                {:else}
                  <span class="w-3 h-3 mr-2 shrink-0 inline-block"></span>
                {/if}
                <span class="w-2 h-2 rounded-full mr-1.5 shrink-0" style="background: {label.color};"></span>
                {label.name}
              </ContextMenu.Item>
            {/each}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

      <!-- Assign -->
      {#if members.length > 0}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Assign</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            {#each members as member}
              <ContextMenu.Item onSelect={() => patchTask({ assigned_to_user_id: member.user_id })}>
                {#if task.assigned_to_user_id === member.user_id}
                  <Check class="w-3 h-3 mr-2 shrink-0" />
                {:else}
                  <span class="w-3 h-3 mr-2 shrink-0 inline-block"></span>
                {/if}
                {member.profile?.display_name ?? member.profile?.email ?? 'Unknown'}
              </ContextMenu.Item>
            {/each}
            {#if task.assigned_to_user_id}
              <ContextMenu.Item onSelect={() => patchTask({ assigned_to_user_id: null })}>Unassign</ContextMenu.Item>
            {/if}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

      <!-- Move to List -->
      {#if lists.length > 0}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Move to List</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            {#each lists as list (list.id)}
              <ContextMenu.Item onSelect={() => patchTask({ list_id: list.id })}>
                {list.name}
              </ContextMenu.Item>
            {/each}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

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
