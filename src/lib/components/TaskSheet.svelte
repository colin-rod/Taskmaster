<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidate } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import {
    Sheet,
    SheetContent,
    SheetClose,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  } from '$lib/components/ui/sheet/index.js';
  import type { Task, RecurrenceRule, ListRole, TaskListMember } from '$lib/types/index.js';
  import { formatStatus, PRIORITY_OPTIONS, STATUS_OPTIONS, getDueDateClass } from '$lib/utils/design-tokens.js';
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import { Plus, Loader, Check, AlertCircle, X, BarChart2 } from '@lucide/svelte';
  import { slide, scale, fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import AssigneePicker from '$lib/components/AssigneePicker.svelte';
  import LabelPicker from '$lib/components/LabelPicker.svelte';
  import LabelBadge from '$lib/components/LabelBadge.svelte';
  import { getUpcomingOccurrences } from '$lib/utils/recurrence.js';
  import { formatDateOnly } from '$lib/utils/dates.js';

  let {
    task = $bindable<Task | null>(null),
    open = $bindable(false),
    userRole = 'owner' as ListRole,
    members = [] as TaskListMember[],
    loading = false,
  }: {
    task: Task | null;
    open: boolean;
    userRole?: ListRole;
    members?: TaskListMember[];
    loading?: boolean;
  } = $props();

  let isViewer = $derived(userRole === 'viewer');
  let taskAssignee = $derived(
    task?.assigned_to_user_id
      ? members.find(m => m.user_id === task!.assigned_to_user_id)?.profile ?? null
      : null
  );
  let upcomingOccurrences = $derived(
    task?.is_recurring && task?.recurrence_rule && task?.due_at
      ? getUpcomingOccurrences(task.due_at, task.recurrence_rule, 5)
      : []
  );

  let editTitle = $state('');
  let editNotes = $state('');
  let editPriority = $state(4);
  let editDueAt = $state('');
  let editStatus = $state('todo');
  let deleting = $state(false);
  let deleteAlertOpen = $state(false);
  let newItemLabel = $state('');
  let addingItem = $state(false);
  let editingItemId = $state<string | null>(null);
  let editingLabel = $state('');
  let draggingId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);
  let preDragOrder = $state<string[]>([]);
  let reorderFormEl = $state<HTMLFormElement | null>(null);
  let reminderDate = $state('');   // ISO date string (for DatePickerPopover)
  let editIsRecurring = $state(false);
  let editRecurrenceRule = $state<RecurrenceRule | null>(null);

  // Progressive disclosure state
  let notesExpanded     = $state(false);
  let showReminder      = $state(false);
  let showRecurring     = $state(false);
  let showChecklist     = $state(false);
  let showLabels        = $state(false);
  let showProgress      = $state(false);

  let editProgressCurrent = $state<number | null>(null);
  let editProgressTotal   = $state<number | null>(null);

  // Pill visibility (derived)
  let showReminderPill  = $derived(!showReminder && editDueAt !== '');
  let showRecurringPill = $derived(!showRecurring && editDueAt !== '');
  let showChecklistPill = $derived(!showChecklist);
  let showLabelsPill    = $derived(!showLabels);
  let showNotesPill     = $derived(!notesExpanded);
  let showProgressPill  = $derived(!showProgress);
  let showPillRow       = $derived(showNotesPill || showReminderPill || showRecurringPill || showChecklistPill || showLabelsPill || showProgressPill);

  let prevCompleted = $state(0);
  let checklistJustFinished = $state(false);
  let justFinishedTimeout: ReturnType<typeof setTimeout>;

  // Autosave state
  type SaveState = 'idle' | 'saving' | 'saved' | 'error';
  let saveState = $state<SaveState>('idle');
  let saveStateResetTimeout: ReturnType<typeof setTimeout> | null = null;
  let latestSaveRequestId = 0;
  let activeSaveCount = $state(0);
  let isInitialized = $state(false);
  let initializedTaskId = $state<string | null>(null);

  // Previous values for $effect change detection
  let prevPriority = $state(4);
  let prevStatus = $state('todo');
  let prevIsRecurring = $state(false);
  let prevRecurrenceRule = $state<string>('null');

  function clearSaveStateResetTimeout() {
    if (saveStateResetTimeout) { clearTimeout(saveStateResetTimeout); saveStateResetTimeout = null; }
  }

  function queueSaveStateIdleReset() {
    clearSaveStateResetTimeout();
    saveStateResetTimeout = setTimeout(() => { saveState = 'idle'; saveStateResetTimeout = null; }, 1500);
  }

  async function autoSave(fields: Record<string, unknown>) {
    if (!task || !open) return;
    const requestId = ++latestSaveRequestId;
    activeSaveCount++;
    clearSaveStateResetTimeout();
    saveState = 'saving';

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        if (requestId === latestSaveRequestId) { saveState = 'saved'; queueSaveStateIdleReset(); }
        await invalidate('app:tasks');
      } else {
        if (requestId === latestSaveRequestId) saveState = 'error';
        toast.error('Failed to save');
      }
    } catch {
      if (requestId === latestSaveRequestId) saveState = 'error';
      toast.error('Network error — please try again');
    } finally {
      activeSaveCount = Math.max(0, activeSaveCount - 1);
    }
  }

  let isMd = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    isMd = mq.matches;
    const handler = (e: MediaQueryListEvent) => { isMd = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  $effect(() => {
    if (task) {
      isInitialized = false;
      editTitle = task.title;
      editNotes = task.notes || '';
      editPriority = task.priority;
      editDueAt = task.due_at ? task.due_at.slice(0, 10) : '';
      editStatus = task.status;
      reminderDate = task.reminder_at ?? '';
      editIsRecurring = task.is_recurring;
      editRecurrenceRule = task.recurrence_rule;
      editProgressCurrent = task.progress_current ?? null;
      editProgressTotal   = task.progress_total ?? null;
      newItemLabel = '';
      prevPriority = task.priority;
      prevStatus = task.status;
      prevIsRecurring = task.is_recurring;
      prevRecurrenceRule = JSON.stringify(task.recurrence_rule);
      // Progressive disclosure: auto-expand fields that have values, but only when switching to a new task
      if (task.id !== initializedTaskId) {
        notesExpanded     = !!(task.notes && task.notes.trim() !== '');
        showReminder      = reminderDate !== '';
        showRecurring     = editIsRecurring;
        showChecklist     = (task.checklist_items?.length ?? 0) > 0;
        showLabels        = (task.labels?.length ?? 0) > 0;
        showProgress      = task.progress_total != null;
        initializedTaskId = task.id;
      }
      // Reset save state when switching tasks
      clearSaveStateResetTimeout();
      saveState = 'idle';
      tick().then(() => { isInitialized = true; });
    }
  });

  // Reset save state when drawer closes
  $effect(() => {
    if (!open) {
      clearSaveStateResetTimeout();
      saveState = 'idle';
      isInitialized = false;
      initializedTaskId = null;
    }
  });

  // Autosave: priority
  $effect(() => {
    if (isInitialized && task && editPriority !== prevPriority && editPriority !== task.priority) {
      autoSave({ priority: editPriority });
      prevPriority = editPriority;
    }
  });

  // Autosave: status
  $effect(() => {
    if (isInitialized && task && editStatus !== prevStatus && editStatus !== task.status) {
      autoSave({ status: editStatus });
      prevStatus = editStatus;
    }
  });

  // Autosave: recurrence
  $effect(() => {
    if (!isInitialized || !task) return;
    const ruleStr = JSON.stringify(editRecurrenceRule);
    if (editIsRecurring !== prevIsRecurring || ruleStr !== prevRecurrenceRule) {
      autoSave({ is_recurring: editIsRecurring, recurrence_rule: editIsRecurring ? editRecurrenceRule : null });
      prevIsRecurring = editIsRecurring;
      prevRecurrenceRule = ruleStr;
    }
  });

  // Re-pill recurring when unchecked from within RecurrenceEditor
  $effect(() => {
    if (isInitialized && !editIsRecurring) showRecurring = false;
  });


  function handleTitleBlur() {
    if (!isInitialized || !task) return;
    const trimmed = editTitle.trim();
    if (!trimmed) { editTitle = task.title; return; }
    if (trimmed === task.title) return;
    autoSave({ title: trimmed });
  }

  function handleNotesBlur() {
    if (!isInitialized || !task || editNotes === (task.notes ?? '')) return;
    autoSave({ notes: editNotes || null });
  }

  function handleDueBlur() {
    if (!isInitialized || !task) return;
    const newDueAt = editDueAt ? `${editDueAt}T00:00:00.000Z` : null;
    const currentDueAt = task.due_at ?? null;
    if (newDueAt !== currentDueAt) autoSave({ due_at: newDueAt });
  }

  function handleReminderBlur() {
    if (!isInitialized || !task) return;
    const newVal = reminderDate ? reminderDate : null;
    const currentVal = task.reminder_at ?? null;
    if (newVal !== currentVal) autoSave({ reminder_at: newVal });
  }

  let checklistItems = $derived(
    (task?.checklist_items ?? []).slice().sort((a, b) => a.position - b.position)
  );
  let hasPendingItems = $derived(
    checklistItems.some((i) => i.id.startsWith('temp-'))
  );

  $effect(() => {
    if (totalCount > 0 && completedCount === totalCount && prevCompleted < totalCount) {
      checklistJustFinished = true;
      clearTimeout(justFinishedTimeout);
      justFinishedTimeout = setTimeout(() => { checklistJustFinished = false; }, 1200);
    }
    prevCompleted = completedCount;
    return () => clearTimeout(justFinishedTimeout);
  });
  let completedCount = $derived(checklistItems.filter((i) => i.is_completed).length);
  let totalCount = $derived(checklistItems.length);

  // Checklist item edit
  function startEditItem(id: string, label: string) {
    editingItemId = id;
    editingLabel = label;
  }

  function cancelEditItem() {
    editingItemId = null;
    editingLabel = '';
  }

  // Drag-to-reorder
  function onDragStart(id: string) {
    if (hasPendingItems) return;
    draggingId = id;
    preDragOrder = (task?.checklist_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => i.id);
  }

  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    dragOverId = id;
  }

  function onDrop(id: string) {
    if (!draggingId || draggingId === id || !task?.checklist_items || !reorderFormEl) return;

    const items = task.checklist_items.slice().sort((a, b) => a.position - b.position);
    const fromIdx = items.findIndex((i) => i.id === draggingId);
    const toIdx = items.findIndex((i) => i.id === id);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);

    // Optimistically update positions
    task.checklist_items = items.map((item, idx) => ({ ...item, position: idx }));

    draggingId = null;
    dragOverId = null;

    // Submit reorder to server
    reorderFormEl.querySelector<HTMLInputElement>('[name="item_ids"]')!.value = JSON.stringify(items.map((i) => i.id));
    reorderFormEl.requestSubmit();
  }

  function onDragEnd() {
    draggingId = null;
    dragOverId = null;
  }
</script>

<Sheet bind:open>
  <SheetContent
    side={isMd ? 'right' : 'bottom'}
    class={isMd ? 'h-full overflow-y-auto w-[440px] px-6 pt-6' : 'max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pt-4 pb-[env(safe-area-inset-bottom,0px)]'}
    showClose={false}
  >
    <SheetHeader class="px-0 pt-0 pb-4 border-b border-border-divider">
      <div class="flex items-center justify-between gap-2">
        {#if task && !isViewer}
          <SheetTitle class="flex-1 min-w-0">
            <label for="edit-title" class="sr-only">Task title</label>
            <input
              id="edit-title"
              name="title"
              type="text"
              maxlength="500"
              bind:value={editTitle}
              required
              onblur={handleTitleBlur}
              placeholder="Task title..."
              class="w-full bg-transparent border-none outline-none text-xl font-semibold font-accent tracking-tight text-foreground placeholder:text-foreground-muted focus-visible:outline-none"
            />
          </SheetTitle>
        {:else if task && isViewer}
          <SheetTitle class="font-accent text-xl tracking-tight text-foreground truncate flex-1 min-w-0">
            {task.title}
          </SheetTitle>
        {:else}
          <SheetTitle class="sr-only">Task details</SheetTitle>
        {/if}
        {#if saveState === 'saving'}
          <span class="save-badge save-badge--saving text-foreground-muted flex items-center gap-1" aria-label="Saving">
            <Loader class="size-3.5 animate-spin" /><span class="text-xs">Saving…</span>
          </span>
        {:else if saveState === 'saved'}
          <span class="save-badge save-badge--saved text-status-done flex items-center gap-1" aria-label="Saved">
            <Check class="size-3.5" /><span class="text-xs">Saved</span>
          </span>
        {:else if saveState === 'error'}
          <span class="save-badge save-badge--error text-destructive animate-[scale-in_0.15s_ease-out] flex items-center gap-1" aria-label="Save failed">
            <AlertCircle class="size-3.5" /><span class="text-xs">Save failed</span>
          </span>
        {:else}
          <span class="save-badge flex items-center gap-1 invisible" aria-hidden="true">
            <Loader class="size-3.5" /><span class="text-xs">Saving…</span>
          </span>
        {/if}
        <SheetClose class="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none">
          <X class="size-4" />
          <span class="sr-only">Close</span>
        </SheetClose>
      </div>
      <SheetDescription class="sr-only">{isViewer ? 'Viewing' : 'Editing'}: {task?.title ?? 'task details'}</SheetDescription>
      {#if task}
        <p class="text-xs text-foreground-muted -mt-1">{formatStatus(task.status)}</p>
      {/if}
    </SheetHeader>

    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {#if saveState === 'saving'}Saving…{:else if saveState === 'saved'}Saved{:else if saveState === 'error'}Save failed — please try again{/if}
    </div>

    {#if loading && !task}
      <!-- Loading skeleton -->
      <div class="space-y-4 mt-4 animate-pulse">
        <div class="h-4 bg-foreground/10 rounded w-3/4"></div>
        <div class="h-3 bg-foreground/10 rounded w-1/2"></div>
        <div class="border-t border-border-divider pt-4 space-y-3">
          <div class="h-3 bg-foreground/10 rounded w-1/3"></div>
          <div class="h-8 bg-foreground/10 rounded w-full"></div>
          <div class="h-8 bg-foreground/10 rounded w-full"></div>
        </div>
      </div>
    {:else if task && isViewer}
      <!-- View-only mode for viewers -->
      <div class="space-y-4 mt-2">
        {#if task.notes}
          <div>
            <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-1.5">Notes</span>
            <p class="text-sm whitespace-pre-wrap wrap-break-word">{task.notes}</p>
          </div>
        {/if}
        <div class="border-t border-border-divider pt-4">
          <h3 class="section-header-bold mb-3 block">Details</h3>
          <div class="space-y-3">
            <div class="flex gap-4">
              <div>
                <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-1.5">Priority</span>
                {#if task}
                  {@const p = PRIORITY_OPTIONS.find(p => p.level === task!.priority)}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {p?.bg ?? 'bg-surface-subtle'} {p?.color ?? 'text-foreground-muted'}">
                    {p?.label ?? 'P4'} — {p?.desc ?? 'Low'}
                  </span>
                {/if}
              </div>
              <div>
                <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-1.5">Status</span>
                {#if task}
                  {@const s = STATUS_OPTIONS.find(s => s.value === task!.status)}
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-subtle {s?.selectClass ?? ''}">
                    <span class="w-1.5 h-1.5 rounded-full {s?.dotColor ?? 'bg-foreground-muted'}"></span>
                    {s?.label ?? formatStatus(task.status)}
                  </span>
                {/if}
              </div>
            </div>
            {#if task.due_at}
              <div>
                <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-1.5">Due date</span>
                <p class="text-sm">{new Date(task.due_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            {/if}
            {#if upcomingOccurrences.length > 0}
              <div>
                <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-1.5">Upcoming</span>
                <ul class="space-y-1">
                  {#each upcomingOccurrences as date}
                    <li class="text-sm text-foreground-secondary flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0"></span>
                      {formatDateOnly(date.toISOString())}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
        {#if (task.checklist_items ?? []).length > 0}
          <div class="border-t border-border-divider pt-4">
            <h3 class="section-header-bold mb-1.5">Checklist</h3>
            <div class="space-y-1 mt-2">
              {#each (task.checklist_items ?? []).slice().sort((a, b) => a.position - b.position) as item (item.id)}
                <div class="flex items-center gap-2 py-1">
                  <div class="w-4 h-4 rounded border flex items-center justify-center shrink-0 {item.is_completed ? 'bg-primary border-primary' : 'border-foreground-muted'}">
                    {#if item.is_completed}
                      <svg class="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    {/if}
                  </div>
                  <span class="text-sm wrap-break-word {item.is_completed ? 'line-through text-foreground-muted' : ''}">{item.label}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else if task}
      <div class="space-y-4 mt-2">

        <!-- Metadata zone (priority, status, due, reminder, recurrence) -->
        <div class="border-t border-border-divider pt-4 space-y-4">

          <h3 class="section-header-bold mb-1">Details</h3>

          <!-- Priority + Status rows -->
          <div class="flex flex-col gap-3">
            <div>
              <span id="priority-label" class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Priority</span>
              <input type="hidden" name="priority" value={editPriority} />
              <div class="segmented-control mt-1" role="group" aria-labelledby="priority-label">
                {#each [[1,'P1'],[2,'P2'],[3,'P3'],[4,'P4']] as [val, lbl] (val)}
                  <button
                    type="button"
                    class="segmented-control__btn segmented-control__btn--p{val} {editPriority === val ? 'segmented-control__btn--active' : ''}"
                    onclick={() => { editPriority = val as 1|2|3|4; }}
                    aria-pressed={editPriority === val}
                    title={val === 1 ? 'Urgent' : val === 2 ? 'High' : val === 3 ? 'Medium' : 'Low'}
                  >{lbl}</button>
                {/each}
              </div>
            </div>
            <div>
              <span id="status-label" class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Status</span>
              <input type="hidden" name="status" value={editStatus} />
              <div class="segmented-control mt-1" role="group" aria-labelledby="status-label">
                {#each [['todo','Todo'],['in_progress','In Progress'],['done','Done'],['canceled','Canceled']] as [val, lbl] (val)}
                  <button
                    type="button"
                    class="segmented-control__btn {editStatus === val ? 'segmented-control__btn--active' : ''}"
                    onclick={() => { editStatus = val as 'todo'|'in_progress'|'done'|'canceled'; }}
                    aria-pressed={editStatus === val}
                  >{lbl}</button>
                {/each}
              </div>
            </div>
          </div>

          <!-- Due date -->
          <div>
            <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">
              Due date
              {#if editDueAt}
                {@const urgency = getDueDateClass(editDueAt)}
                {#if urgency}
                  <span class="ml-1 normal-case tracking-normal font-medium {urgency}">
                    — {urgency === 'due-overdue' ? 'Overdue' : urgency === 'due-today' ? 'Today' : 'Soon'}
                  </span>
                {/if}
              {/if}
            </span>
            <div class="mt-1">
              <DatePickerPopover
                bind:value={editDueAt}
                mode="controlled"
                disabled={isViewer}
                onchange={handleDueBlur}
              />
            </div>
          </div>

          <!-- Progressive disclosure pills -->
          {#if showPillRow}
            <div class="flex gap-2 flex-wrap">
              {#if showNotesPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { notesExpanded = true; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Add notes"
                >+ Notes</button>
              {/if}
              {#if showReminderPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showReminder = true; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Add a reminder"
                >+ Reminder</button>
              {/if}
              {#if showRecurringPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showRecurring = true; editIsRecurring = true; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Make this task recurring"
                >+ Recurring</button>
              {/if}
              {#if showChecklistPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showChecklist = true; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Add a checklist"
                >+ Checklist</button>
              {/if}
              {#if showLabelsPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showLabels = true; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Add labels"
                >+ Labels</button>
              {/if}
              {#if showProgressPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showProgress = true; editProgressTotal = editProgressTotal ?? 0; }}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-surface/60 text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/40 hover:border-solid transition-all duration-150 min-h-8"
                  aria-label="Track progress for this task"
                ><BarChart2 class="w-3 h-3" />+ Progress</button>
              {/if}
            </div>
          {/if}

          <!-- Notes -->
          {#if notesExpanded}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <div class="flex items-center justify-between">
                <label for="edit-notes" class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Notes</label>
                {#if !isViewer}
                  <button
                    type="button"
                    class="text-foreground-muted hover:text-foreground-secondary transition-colors p-1 rounded hover:bg-surface-subtle flex items-center justify-center min-w-11 min-h-11"
                    aria-label="Collapse notes"
                    onclick={() => { notesExpanded = false; }}
                  ><X class="size-3.5" /></button>
                {/if}
              </div>
              <textarea
                id="edit-notes"
                name="notes"
                aria-label="Notes"
                maxlength="10000"
                bind:value={editNotes}
                rows="4"
                placeholder="Add context, links, or extra detail..."
                onblur={handleNotesBlur}
                class="select-input mt-1 resize-y min-h-[90px] text-sm leading-relaxed"
              ></textarea>
            </div>
          {/if}

          <!-- Reminder -->
          {#if showReminder}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <div class="flex items-center justify-between">
                <label for="edit-reminder-time" class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Reminder</label>
                {#if !isViewer}
                  <button
                    type="button"
                    class="text-foreground-muted hover:text-foreground-secondary transition-colors p-1 rounded hover:bg-surface-subtle flex items-center justify-center min-w-11 min-h-11"
                    aria-label="Remove reminder"
                    onclick={() => {
                      if (reminderDate) autoSave({ reminder_at: null });
                      reminderDate = ''; showReminder = false;
                    }}
                  ><X class="size-3.5" /></button>
                {/if}
              </div>
              <div class="mt-1">
                <DatePickerPopover
                  bind:value={reminderDate}
                  mode="controlled"
                  disabled={isViewer}
                  onchange={handleReminderBlur}
                />
              </div>
            </div>
          {/if}

          <!-- Recurrence -->
          {#if showRecurring}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <RecurrenceEditor bind:isRecurring={editIsRecurring} bind:recurrenceRule={editRecurrenceRule} onclose={() => { editIsRecurring = false; showRecurring = false; }} />
            </div>
          {/if}

          <!-- Upcoming recurrences -->
          {#if upcomingOccurrences.length > 0}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary block mb-2">Upcoming</span>
              <ul class="space-y-1">
                {#each upcomingOccurrences as date}
                  <li class="text-sm text-foreground-secondary flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0"></span>
                    {formatDateOnly(date.toISOString())}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

        </div><!-- end metadata zone -->

      </div>

      <!-- Assign to (only for shared lists with >1 member, hidden for viewers) -->
      {#if members.length > 1 && !isViewer}
        <div class="mt-4 pt-4 border-t border-border-divider">
          <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Assign to</span>
          <div class="mt-1">
            <AssigneePicker taskId={task.id} assignee={taskAssignee} {members} disabled={isViewer} />
          </div>
        </div>
      {/if}

      <!-- Labels Section -->
      {#if showLabels}
      <div class="mt-4 pt-4 border-t border-border-divider" transition:slide={{ duration: 180, easing: cubicOut }}>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Labels</span>
          {#if !isViewer && (task.labels?.length ?? 0) === 0}
            <button
              type="button"
              class="text-foreground-muted hover:text-foreground-secondary transition-colors p-1 rounded hover:bg-surface-subtle flex items-center justify-center min-w-11 min-h-11"
              aria-label="Remove labels section"
              onclick={() => { showLabels = false; }}
            ><X class="size-3.5" /></button>
          {/if}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          {#each task.labels ?? [] as label (label.id)}
            <LabelBadge {label} size="md" />
          {/each}
          {#if !isViewer}
            <LabelPicker
              taskId={task.id}
              listId={task.list_id}
              currentLabels={task.labels ?? []}
              disabled={isViewer}
            />
          {/if}
        </div>
      </div>
      {/if}

      <!-- Checklist Section -->
      {#if showChecklist}
      <div class="mt-4 pt-4 border-t border-border-divider" transition:slide={{ duration: 180, easing: cubicOut }}>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary">Checklist</span>
          {#if !isViewer && totalCount === 0}
            <button
              type="button"
              class="text-foreground-muted hover:text-foreground-secondary transition-colors p-1 rounded hover:bg-surface-subtle flex items-center justify-center min-w-11 min-h-11"
              aria-label="Remove checklist"
              onclick={() => { showChecklist = false; }}
            ><X class="size-3.5" /></button>
          {/if}
        </div>

        <!-- Progress bar -->
        {#if totalCount > 0}
          <div
            class="h-2 rounded-full bg-surface-subtle mb-3 overflow-hidden"
            class:progress-finish={checklistJustFinished}
            role="progressbar"
            aria-valuenow={Math.round((completedCount / totalCount) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Checklist progress: {completedCount} of {totalCount} items complete"
            aria-valuetext="{completedCount} of {totalCount} complete"
          >
            <div
              class="h-full rounded-full transition-all duration-300 {completedCount === totalCount ? 'bg-status-done' : 'bg-primary'}"
              style="width: {(completedCount / totalCount) * 100}%"
            ></div>
          </div>
        {/if}

        <!-- Empty state hint -->
        {#if totalCount === 0}
          <p class="text-xs text-foreground-muted py-2">Break this task into steps</p>
        {/if}

        <!-- All done celebration -->
        {#if checklistJustFinished}
          <p class="text-xs font-medium text-status-done py-1" in:fly={{ y: 4, duration: 200, easing: cubicOut }} out:fade={{ duration: 150 }}>All done &#10003;</p>
        {/if}

        <!-- Checklist items -->
        {#if checklistItems.length > 0}
          <!-- Hidden reorder form -->
          <form
            method="POST"
            action="?/reorderChecklistItems"
            bind:this={reorderFormEl}
            use:enhance={() => {
              const snapshot = preDragOrder;
              return async ({ result, update }) => {
                if (result.type !== 'success') {
                  // Rollback to pre-drag order
                  if (task?.checklist_items) {
                    task.checklist_items = task.checklist_items.map((item) => ({
                      ...item,
                      position: snapshot.indexOf(item.id),
                    }));
                  }
                  toast.error('Couldn\'t save that order — try again.');
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="item_ids" value="" />
          </form>
          <div role="list" class="space-y-1 mb-3">
            {#each checklistItems as item (item.id)}
              <div
                role="listitem"
                class="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-primary-tint/60 transition-colors {draggingId === item.id ? 'checklist-item--dragging' : ''} {dragOverId === item.id && draggingId !== item.id ? 'ring-1 ring-primary' : ''}"
                in:fly={{ y: 6, duration: 160, easing: cubicOut }}
                out:fly={{ y: -6, duration: 130, easing: cubicOut }}
                draggable={!hasPendingItems && isMd}
                ondragstart={() => onDragStart(item.id)}
                ondragover={(e) => onDragOver(e, item.id)}
                ondrop={() => onDrop(item.id)}
                ondragend={onDragEnd}
              >
                <!-- Drag handle -->
                <button
                  type="button"
                  class="hidden md:flex md:opacity-0 md:group-hover:opacity-100 shrink-0 text-foreground-muted transition-opacity {hasPendingItems ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}"
                  aria-label="Drag to reorder"
                  tabindex={-1}
                  disabled={hasPendingItems}
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                    <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                    <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                  </svg>
                </button>
                <!-- Toggle -->
                <form
                  method="POST"
                  action="?/toggleChecklistItem"
                  use:enhance={() => {
                    const wasCompleted = item.is_completed;
                    item.is_completed = !item.is_completed;
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        if ((result.data as { rolled?: boolean })?.rolled) {
                          toast.success('Repeated — next occurrence is set.');
                        } else {
                          toast.success(wasCompleted ? 'Item unchecked' : 'Item checked');
                        }
                      } else {
                        item.is_completed = wasCompleted;
                      }
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="is_completed" value={String(item.is_completed)} />
                  <div class="flex items-center justify-center w-11 h-11 -m-3.5 shrink-0">
                    <button
                      type="submit"
                      class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                        {item.is_completed ? 'bg-primary border-primary' : 'border-foreground-muted hover:border-primary'}"
                      aria-label={item.is_completed ? 'Uncheck item' : 'Check item'}
                    >
                      {#if item.is_completed}
                        <svg class="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      {/if}
                    </button>
                  </div>
                </form>

                <!-- Label / inline edit -->
                {#if editingItemId === item.id}
                  <form
                    method="POST"
                    action="?/editChecklistItem"
                    class="flex-1"
                    use:enhance={() => {
                      const oldLabel = item.label;
                      const newLabel = editingLabel.trim();
                      if (!newLabel) { cancelEditItem(); return async () => {}; }
                      item.label = newLabel;
                      editingItemId = null;
                      return async ({ result, update }) => {
                        if (result.type !== 'success') {
                          item.label = oldLabel;
                          toast.error('Couldn\'t save that change — try again.');
                        }
                        await update();
                      };
                    }}
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      name="label"
                      type="text"
                      maxlength="500"
                      aria-label="Edit item label"
                      bind:value={editingLabel}
                      autofocus
                      class="w-full bg-transparent text-sm outline-none border-b border-primary focus:border-primary"
                      onblur={(e) => { (e.currentTarget.closest('form') as HTMLFormElement)?.requestSubmit(); }}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('form') as HTMLFormElement)?.requestSubmit(); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelEditItem(); }
                      }}
                    />
                  </form>
                {:else}
                  <button
                    type="button"
                    class="flex-1 text-left text-sm {item.is_completed ? 'line-through text-foreground-muted cursor-default' : 'cursor-text'}"
                    onclick={() => { if (!item.is_completed) startEditItem(item.id, item.label); }}
                    tabindex={item.is_completed ? -1 : 0}
                    aria-label="Edit item label"
                  >
                    {item.label}
                  </button>
                {/if}

                <!-- Delete -->
                <form
                  method="POST"
                  action="?/deleteChecklistItem"
                  use:enhance={() => {
                    const idx = task!.checklist_items!.findIndex(i => i.id === item.id);
                    const removed = task!.checklist_items![idx];
                    task!.checklist_items = task!.checklist_items!.filter(i => i.id !== item.id);
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        toast.success('Item removed');
                      } else {
                        const rollback = [...task!.checklist_items!];
                        rollback.splice(idx, 0, removed);
                        task!.checklist_items = rollback;
                      }
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    class="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 min-w-11 min-h-11 flex items-center justify-center text-foreground-muted hover:text-destructive transition-opacity"
                    aria-label="Delete item"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Add new item -->
        <form
          method="POST"
          action="?/addChecklistItem"
          class="flex items-center gap-2"
          use:enhance={() => {
            addingItem = true;
            const label = newItemLabel.trim();
            const tempItem = {
              id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              task_id: task!.id,
              label,
              is_completed: false,
              position: (task?.checklist_items?.length ?? 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            task!.checklist_items = [...(task!.checklist_items ?? []), tempItem];
            newItemLabel = '';
            return async ({ result, update }) => {
              addingItem = false;
              if (result.type !== 'success') {
                task!.checklist_items = task!.checklist_items!.filter(i => i.id !== tempItem.id);
                newItemLabel = label;
              }
              await update();
            };
          }}
        >
          <input type="hidden" name="task_id" value={task.id} />
          <Plus class="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <input
            name="label"
            type="text"
            maxlength="500"
            bind:value={newItemLabel}
            placeholder="Add item..."
            aria-label="New checklist item"
            class="flex-1 bg-transparent text-sm py-1 outline-none placeholder:text-foreground-muted"
            disabled={addingItem}
          />
          {#if newItemLabel.trim()}
            <button
              type="submit"
              class="text-xs font-medium text-primary hover:text-primary-hover disabled:opacity-50"
              disabled={addingItem}
            >
              Add
            </button>
          {/if}
        </form>

      </div>
      {/if}

      <!-- Progress Section -->
      {#if showProgress}
      <div class="mt-4 pt-4 border-t border-border-divider" transition:slide={{ duration: 180, easing: cubicOut }}>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold tracking-widest uppercase text-foreground-secondary flex items-center gap-1.5">
            <BarChart2 class="w-3.5 h-3.5" />Progress
          </span>
          {#if !isViewer}
            <button
              type="button"
              class="text-xs text-foreground-muted hover:text-destructive transition-colors"
              onclick={() => {
                showProgress = false;
                editProgressCurrent = null;
                editProgressTotal = null;
                autoSave({ progress_current: null, progress_total: null });
              }}
            >Remove</button>
          {/if}
        </div>
        {#if editProgressTotal != null && editProgressTotal > 0}
          {@const pct = Math.min(100, Math.round(((editProgressCurrent ?? 0) / editProgressTotal) * 100))}
          <div class="mb-3">
            <div class="flex justify-between text-xs text-foreground-muted mb-1">
              <span>{editProgressCurrent ?? 0} / {editProgressTotal}</span>
              <span>{pct}%</span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
              <div class="h-full rounded-full bg-primary/70 transition-all duration-300" style="width: {pct}%"></div>
            </div>
          </div>
        {/if}
        {#if !isViewer}
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <label for="progress-current" class="text-xs text-foreground-muted block mb-1">Current</label>
              <input
                id="progress-current"
                type="number"
                min="0"
                value={editProgressCurrent ?? 0}
                class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                oninput={(e) => {
                  const val = parseInt(e.currentTarget.value, 10);
                  editProgressCurrent = isNaN(val) ? 0 : Math.max(0, val);
                  autoSave({ progress_current: editProgressCurrent, progress_total: editProgressTotal });
                }}
                disabled={isViewer}
              />
            </div>
            <div class="text-foreground-muted text-sm pt-5">/</div>
            <div class="flex-1">
              <label for="progress-total" class="text-xs text-foreground-muted block mb-1">Total</label>
              <input
                id="progress-total"
                type="number"
                min="1"
                value={editProgressTotal ?? ''}
                placeholder="e.g. 3000"
                class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                oninput={(e) => {
                  const val = parseInt(e.currentTarget.value, 10);
                  editProgressTotal = isNaN(val) ? null : Math.max(1, val);
                  autoSave({ progress_current: editProgressCurrent ?? 0, progress_total: editProgressTotal });
                }}
                disabled={isViewer}
              />
            </div>
          </div>
        {/if}
      </div>
      {/if}

      <!-- Delete (separate form) -->
      <div class="mt-4 pt-4 border-t border-border-divider">
        <AlertDialog.Root bind:open={deleteAlertOpen}>
          <AlertDialog.Trigger>
            <button
              type="button"
              class="w-full rounded-md border border-destructive/60 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/80 transition-colors disabled:opacity-50"
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Delete task'}
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete this task?</AlertDialog.Title>
              <AlertDialog.Description>This task will be permanently deleted and cannot be recovered.</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <form
                method="POST"
                action="?/deleteTask"
                class="w-full"
                use:enhance={() => {
                  deleting = true;
                  deleteAlertOpen = false;
                  const savedTask = task;
                  open = false;
                  task = null;
                  return async ({ result, update }) => {
                    deleting = false;
                    if (result.type === 'success') {
                      toast.success('Task deleted');
                    } else {
                      open = true;
                      task = savedTask;
                    }
                    await update();
                  };
                }}
              >
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  class="inline-flex w-full items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                  disabled={deleting}
                >
                  Delete
                </button>
              </form>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    {:else}
      <EmptyState
        title="Select a task"
        subtitle="Choose a task from your list to view or edit details"
      />
    {/if}
  </SheetContent>
</Sheet>
