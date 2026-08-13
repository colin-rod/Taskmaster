<script lang="ts">
  import { enhance } from '$app/forms';
  import { on } from 'svelte/events';
  import { invalidate, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Task, ListRole, Profile, Label, TaskList } from '$lib/types/index.js';
  import { describeRecurrence } from '$lib/utils/recurrence.js';
  import { Repeat2, Ellipsis, Check, Bell, CircleDot, BarChart2, Pencil } from '@lucide/svelte';
  import LabelBadge from '$lib/components/LabelBadge.svelte';
  import LabelPicker from '$lib/components/LabelPicker.svelte';
  import InlineEditTitle from '$lib/components/InlineEditTitle.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';
  import { formatDateOnly, formatShortDate } from '$lib/utils/dates.js';
  import { REMINDER_PRESETS, describeReminderOffset, resolveReminderAt } from '$lib/utils/reminders.js';
  import { getDueDateClass, getPriorityDotClass } from '$lib/utils/design-tokens.js';
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

  // Touch/no-hover devices: a single tap on the row body opens the detail sheet
  // (there's no hover to progressively reveal metadata inline). On pointer
  // devices we keep double-click / ellipsis to open, so a stray click doesn't.
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

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

  let isDone = $derived(optimisticStatus === 'done' || optimisticStatus === 'canceled');

  // Resting-state "primary signal": the single most important piece of metadata
  // shown when the row is not hovered. Precedence: urgent due date → P1/P2 → none.
  let dueClass = $derived(getDueDateClass(task.due_at)); // '' unless overdue/today/≤3d
  let showDueChip = $derived(!isDone && !!task.due_at);
  let showPriorityDot = $derived(!isDone && (task.priority === 1 || task.priority === 2));

  // Reminder tooltip text, covering both kinds: a relative reminder shows the
  // offset plus the date it currently resolves to, since that date moves with
  // the due date.
  let reminderLabel = $derived.by(() => {
    if (task.reminder_offset_minutes != null) {
      const at = resolveReminderAt(task.due_at, task.reminder_offset_minutes);
      const offset = describeReminderOffset(task.reminder_offset_minutes);
      return at ? `${offset} (${formatDateOnly(at.toISOString())})` : offset;
    }
    if (task.reminder_at) return formatDateOnly(task.reminder_at);
    return '';
  });

  // "Does the row have inline metadata to show?" — drives the always-visible
  // strip that sits on the title line. Due date and labels are rendered
  // separately, so they're deliberately not part of this check.
  let hasHoverMeta = $derived(
    optimisticStatus === 'in_progress' ||
    task.is_recurring ||
    !!reminderLabel ||
    checklistTotal > 0 ||
    task.progress_total != null ||
    !!task.assignee
  );

  // Relative "Completed Nh ago" label for done rows.
  let completedLabel = $derived.by(() => {
    if (!isDone) return '';
    const ts = task.completed_at ?? task.updated_at;
    if (!ts) return 'Completed';
    const diffMs = Date.now() - new Date(ts).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Completed just now';
    if (mins < 60) return `Completed ${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `Completed ${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `Completed ${days}d ago`;
    return `Completed ${formatShortDate(ts)}`;
  });

  let deleteForm = $state<HTMLFormElement | undefined>(undefined);
  let deleteAlertOpen = $state(false);
  let deleted = $state(false);
  let progressPopoverOpen = $state(false);
  let progressInputValue = $state(0);
  let progressShowLeft = $state(false);
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

  function quickDateNextMonth(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  function deleteTaskFromContext() {
    deleteAlertOpen = true;
  }

  // Right-click parity for the inline checklist popover. There's no REST route
  // for checklist items, so this posts to the same `?/toggleChecklistItem` form
  // action every task page exposes.
  async function toggleChecklistItem(itemId: string, currentlyDone: boolean) {
    optimisticChecklist[itemId] = !currentlyDone;
    const body = new FormData();
    body.set('id', itemId);
    body.set('task_id', task.id);
    body.set('is_completed', String(currentlyDone));
    const res = await fetch('?/toggleChecklistItem', {
      method: 'POST',
      headers: { 'x-sveltekit-action': 'true' },
      body,
    });
    if (!res.ok) {
      optimisticChecklist[itemId] = currentlyDone;
      toast.error('Change not saved — please try again.');
      return;
    }
    await invalidate('app:tasks');
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

  // Reference to the checkbox toggle form so keyboard shortcuts can complete a task.
  let toggleForm = $state<HTMLFormElement | undefined>(undefined);

  // The row is a ContextMenu.Trigger, so its own onclick arrives via a spread
  // ({...props}) and is attached as a real DOM property. A plain onclick on this
  // button would instead be *delegated* — replayed later from the root listener —
  // so anything that sets cancelBubble on the way up kills the walk before it
  // reaches us and the menu never opens. Attaching directly restores the
  // natural ordering: this fires on the button, before the row sees the click.
  function attachOpenDetails(node: HTMLElement) {
    return on(node, 'click', (e) => {
      e.stopPropagation();
      onselect(task);
    });
  }

  function handleRowClick(e: MouseEvent) {
    if (!isTouchDevice) return; // pointer devices open via dblclick / ellipsis
    const target = e.target as HTMLElement;
    // Don't hijack taps that land on the row's own interactive controls.
    if (target.closest('button, a, input, [role="menuitem"], form, [data-radix-popper-content-wrapper]')) return;
    onselect(task);
  }

  function handleRowKeydown(e: KeyboardEvent) {
    // Only act on shortcuts when the row itself is focused (not an inner input/button).
    if (e.target !== e.currentTarget) return;
    switch (e.key) {
      case 'Enter':
      case 'o':
        e.preventDefault();
        onselect(task);
        break;
      case 'x':
      case ' ': // Space toggles completion
        if (canEdit) {
          e.preventDefault();
          toggleForm?.requestSubmit();
        }
        break;
      case 'e':
        if (canEdit) {
          e.preventDefault();
          onselect(task); // open sheet to edit — full inline title edit lives there
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (canEdit) {
          e.preventDefault();
          deleteAlertOpen = true;
        }
        break;
    }
  }
</script>

{#if !deleted}
<div out:fly={{ y: -4, duration: motionDuration, easing: cubicOut }}>
<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="task-row-hover flex items-center gap-3 rounded-lg border bg-surface px-4 py-2.5 group overflow-hidden"
        class:is-completing-row={justCompleted}
        class:task-row-in-progress={optimisticStatus === 'in_progress'}
        tabindex="0"
        role="button"
        ondblclick={() => onselect(task)}
        onclick={handleRowClick}
        onkeydown={handleRowKeydown}
      >
        <!-- Toggle checkbox -->
        {#if userRole === 'viewer'}
          <div
            class="w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0
              {task.status === 'done' ? 'bg-primary border-primary' : task.status === 'in_progress' ? 'border-status-doing' : 'border-border-strong'}"
          >
            {#if task.status === 'done'}
              <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 6l3 3 5-5" />
              </svg>
            {/if}
          </div>
        {:else}
          <form
            bind:this={toggleForm}
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
              type="button"
              class="tap-target shrink-0 flex items-center justify-center"
              disabled={toggling}
              onpointerdown={(e) => e.stopPropagation()}
              onclick={(e) => {
                e.stopPropagation();
                toggleForm?.requestSubmit();
              }}
              aria-label={optimisticStatus === 'done' ? 'Reopen task' : 'Complete task'}
            >
              <span
                class="w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center transition-all
                  {optimisticStatus === 'done' ? 'bg-primary border-primary ring-2 ring-[hsl(var(--status-done)/0.2)]' : optimisticStatus === 'in_progress' ? 'border-status-doing group-hover:border-primary' : 'border-border-strong hover:border-primary'}
                  {toggling ? 'opacity-50' : ''}"
                class:is-completing={justCompleted}
              >
                {#if optimisticStatus === 'done'}
                  <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 6l3 3 5-5" stroke-dasharray="20" stroke-dashoffset="20" class:is-completing={justCompleted} />
                  </svg>
                {/if}
              </span>
            </button>
          </form>
        {/if}

        <!-- Task content — inline editable fields -->
        <div class="flex-1 min-w-0 overflow-hidden">
          <div class="flex items-center gap-2 min-w-0">
            <div class="flex-1 min-w-0 overflow-hidden {optimisticStatus === 'done' ? (justCompleted ? 'task-done-title' : 'line-through') + ' text-foreground-muted/70 text-[14px]' : 'font-[510] text-[15px] text-foreground tracking-[-0.01em]'}">
              <InlineEditTitle taskId={task.id} value={task.title} disabled={!canEdit} />
            </div>
            <!-- Labels — always visible when the task has them, so the row height
                 never changes on hover. Adding/removing labels lives in the
                 right-click menu and the detail sheet. -->
            {#if !isDone && task.labels?.length}
              {#if canEdit}
                <div class="relative flex items-center shrink-0">
                  <button
                    type="button"
                    class="flex items-center gap-1 rounded hover:opacity-80 transition-opacity"
                    onclick={(e) => { e.stopPropagation(); labelPickerOpen = true; }}
                    aria-label="Edit labels"
                  >
                    {#each task.labels.slice(0, 3) as label (label.id)}
                      <LabelBadge {label} size="sm" />
                    {/each}
                    {#if task.labels.length > 3}
                      <span class="text-[10px] text-foreground-muted">+{task.labels.length - 3}</span>
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
              {:else}
                <div class="flex items-center gap-1 shrink-0">
                  {#each task.labels.slice(0, 3) as label (label.id)}
                    <LabelBadge {label} size="sm" />
                  {/each}
                  {#if task.labels.length > 3}
                    <span class="text-[10px] text-foreground-muted">+{task.labels.length - 3}</span>
                  {/if}
                </div>
              {/if}
            {/if}
            <!-- Inline metadata strip — always visible (never hover-revealed), so
                 the row height is constant. Interactive editing of each item lives
                 in the right-click menu and the detail sheet. -->
            {#if hasHoverMeta && !isDone}
              <div class="flex items-center gap-1.5 shrink-0" data-row-interactive>
                {#if optimisticStatus === 'in_progress'}
                  <span class="text-status-doing flex items-center" aria-label="In progress" title="In progress">
                    <CircleDot class="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                {/if}
                {#if task.is_recurring}
                  <span class="text-accent flex items-center" title={task.recurrence_rule ? describeRecurrence(task.recurrence_rule) : 'Recurring'}>
                    <Repeat2 class="w-3.5 h-3.5" aria-hidden="true" />
                    <span class="sr-only">Recurring</span>
                  </span>
                {/if}
                {#if reminderLabel}
                  <span class="text-status-doing flex items-center" aria-label="Reminder set" title="Reminder: {reminderLabel}">
                    <Bell class="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                {/if}

                <!-- Checklist badge — interactive popover -->
                {#if checklistTotal > 0}
                  <Popover.Root>
                    <Popover.Trigger>
                      <button
                        type="button"
                        class="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded-full cursor-pointer {checklistDone === checklistTotal ? 'bg-status-done/10 text-status-done' : 'bg-background text-foreground-muted/80 border border-border/50'}"
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
                  {@const isComplete = (task.progress_current ?? 0) >= task.progress_total! && task.progress_total! > 0}
                  {@const badgeClasses = isComplete ? 'bg-status-done/10 text-status-done' : 'bg-background text-foreground-muted/80 border border-border/50'}
                  {@const displayValue = progressShowLeft ? (task.progress_total! - (task.progress_current ?? 0)) : (task.progress_current ?? 0)}
                  <Popover.Root bind:open={progressPopoverOpen}>
                    <div class="flex items-center">
                      <button
                        type="button"
                        onclick={() => { progressShowLeft = !progressShowLeft; }}
                        class="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded-l-full cursor-pointer {badgeClasses} border-r-0"
                        aria-label="{progressShowLeft ? 'Remaining' : 'Progress'}: {displayValue} of {task.progress_total}"
                        title={progressShowLeft ? 'Showing remaining — tap to show done' : 'Showing done — tap to show remaining'}
                      >
                        <BarChart2 class="w-3 h-3" aria-hidden="true" />
                        {displayValue}/{task.progress_total}{#if progressShowLeft}<span class="text-[9px] opacity-60 ml-0.5">left</span>{/if}
                      </button>
                      <Popover.Trigger>
                        <button
                          type="button"
                          onclick={() => { progressInputValue = task.progress_current ?? 0; }}
                          class="text-[11px] px-1 py-0.5 rounded-r-full cursor-pointer {badgeClasses} border-l-0"
                          aria-label="Edit progress"
                        >
                          <Pencil class="w-2.5 h-2.5" />
                        </button>
                      </Popover.Trigger>
                    </div>
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

                {#if task.assignee}
                  <AssigneePicker
                    taskId={task.id}
                    assignee={task.assignee}
                    {members}
                    disabled={!canEdit}
                  />
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Right-aligned signals: completion time on done rows; else due date +
             P1/P2 dot. Always visible — nothing swaps in or out on hover, so the
             row never changes size. -->
        {#if isDone}
          <span class="shrink-0 text-[12.5px] text-foreground-muted tabular-nums whitespace-nowrap">{completedLabel}</span>
        {:else}
          <div class="flex items-center gap-2 shrink-0">
            {#if showDueChip}
              <span class="text-[12.5px] font-medium whitespace-nowrap {dueClass || 'text-foreground-muted'}">{formatDateOnly(task.due_at)}</span>
            {/if}
            {#if showPriorityDot}
              <span class="w-1.5 h-1.5 rounded-full {getPriorityDotClass(task.priority)}" aria-label="Priority P{task.priority}" title="Priority P{task.priority}"></span>
            {/if}
          </div>
        {/if}

        <!-- More menu (opens TaskSheet). Always tappable on touch; revealed on hover on desktop. -->
        <button
          type="button"
          class="tap-target shrink-0 flex items-center justify-center rounded-md text-foreground-muted/50 md:text-transparent md:group-hover:text-foreground-muted md:group-focus-within:text-foreground-muted hover:text-primary! hover:bg-primary/10 transition-all duration-150"
          data-row-interactive
          {@attach attachOpenDetails}
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
        <ContextMenu.SubTrigger>Status</ContextMenu.SubTrigger>
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
        <ContextMenu.SubTrigger>Priority</ContextMenu.SubTrigger>
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
        <ContextMenu.SubTrigger>Due Date</ContextMenu.SubTrigger>
        <ContextMenu.SubContent>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(0) })}>Today</ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(1) })}>
            <span class="flex items-center justify-between w-full gap-4">
              <span>Tomorrow</span>
              <span class="text-foreground-secondary text-xs">{formatShortDate(quickDate(1))}</span>
            </span>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(7) })}>
            <span class="flex items-center justify-between w-full gap-4">
              <span>Next week</span>
              <span class="text-foreground-secondary text-xs">{formatShortDate(quickDate(7))}</span>
            </span>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDate(14) })}>
            <span class="flex items-center justify-between w-full gap-4">
              <span>In two weeks</span>
              <span class="text-foreground-secondary text-xs">{formatShortDate(quickDate(14))}</span>
            </span>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => patchTask({ due_at: quickDateNextMonth() })}>
            <span class="flex items-center justify-between w-full gap-4">
              <span>Next month</span>
              <span class="text-foreground-secondary text-xs">{formatShortDate(quickDateNextMonth())}</span>
            </span>
          </ContextMenu.Item>
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
          <ContextMenu.SubTrigger>Reminder</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            {#each REMINDER_PRESETS as preset (preset.minutes)}
              <ContextMenu.Item onSelect={() => patchTask({ reminder_offset_minutes: preset.minutes })}>
                {preset.label}
              </ContextMenu.Item>
            {/each}
            {#if task.reminder_at || task.reminder_offset_minutes != null}
              <ContextMenu.Separator />
              <ContextMenu.Item onSelect={() => patchTask({ reminder_at: null, reminder_offset_minutes: null })}>
                Clear reminder
              </ContextMenu.Item>
            {/if}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

      <!-- Checklist — toggle items without opening the detail sheet -->
      {#if checklistTotal > 0}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Checklist ({checklistDone}/{checklistTotal})</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            {#each sortedChecklistItems as item (item.id)}
              {@const done = optimisticChecklist[item.id] ?? item.is_completed}
              <ContextMenu.Item onSelect={() => toggleChecklistItem(item.id, done)}>
                {#if done}
                  <Check class="w-3 h-3 mr-2 shrink-0" />
                {:else}
                  <span class="w-3 h-3 mr-2 shrink-0 inline-block"></span>
                {/if}
                <span class={done ? 'line-through text-foreground-muted' : ''}>{item.label}</span>
              </ContextMenu.Item>
            {/each}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      {/if}

      <!-- Progress -->
      {#if task.progress_total != null}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Progress ({task.progress_current ?? 0}/{task.progress_total})</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            <ContextMenu.Item onSelect={() => patchTask({ progress_current: Math.min(task.progress_total!, (task.progress_current ?? 0) + 1) })}>
              +1
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ progress_current: Math.max(0, (task.progress_current ?? 0) - 1) })}>
              −1
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ progress_current: task.progress_total })}>
              Mark complete
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => patchTask({ progress_current: 0 })}>Reset to 0</ContextMenu.Item>
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
