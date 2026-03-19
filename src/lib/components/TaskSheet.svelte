<script lang="ts">
  import { tick } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  } from '$lib/components/ui/sheet/index.js';
  import type { Task, RecurrenceRule, ListRole, TaskListMember } from '$lib/types/index.js';
  import { getPriorityLabel, formatStatus } from '$lib/utils/design-tokens.js';
  import { hasTime, buildDueAt, formatTimeBlock } from '$lib/utils/dates.js';
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';
  import TimeInput from '$lib/components/TimeInput.svelte';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import { Plus, Loader, Check, AlertCircle } from '@lucide/svelte';
  import { slide, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  let {
    task = $bindable<Task | null>(null),
    open = $bindable(false),
    userRole = 'owner' as ListRole,
    members = [] as TaskListMember[],
  }: {
    task: Task | null;
    open: boolean;
    userRole?: ListRole;
    members?: TaskListMember[];
  } = $props();

  let isViewer = $derived(userRole === 'viewer');

  let editTitle = $state('');
  let editNotes = $state('');
  let editPriority = $state(4);
  let editDueAt = $state('');
  let editDueTime = $state('');
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
  let reminderDate = $state('');   // YYYY-MM-DD ISO string (for DatePickerPopover)
  let reminderTime = $state('');   // HH:MM
  let editStartAt = $state('');
  let editStartTime = $state('');
  let editDurationMinutes = $state<number | null>(null);
  let editIsRecurring = $state(false);
  let editRecurrenceRule = $state<RecurrenceRule | null>(null);

  // Progressive disclosure state
  let notesExpanded     = $state(false);
  let showTime          = $state(false);
  let showReminder      = $state(false);
  let showTimeBlock     = $state(false);
  let showRecurring     = $state(false);
  let checklistExpanded = $state(true);

  // Pill visibility (derived)
  let showTimePill      = $derived(editDueAt !== '' && !showTime);
  let showReminderPill  = $derived(!showReminder);
  let showTimeBlockPill = $derived(!showTimeBlock);
  let showRecurringPill = $derived(!showRecurring);
  let showPillRow       = $derived(showTimePill || showReminderPill || showTimeBlockPill || showRecurringPill);

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
        await invalidateAll();
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
      if (task.due_at) {
        const d = new Date(task.due_at);
        editDueAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        editDueTime = hasTime(task.due_at)
          ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          : '';
      } else {
        editDueAt = '';
        editDueTime = '';
      }
      editStatus = task.status;
      if (task.reminder_at) {
        const r = new Date(task.reminder_at);
        reminderDate = `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}T12:00:00.000Z`;
        reminderTime = `${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}`;
      } else {
        reminderDate = '';
        reminderTime = '';
      }
      if (task.start_at) {
        const s = new Date(task.start_at);
        editStartAt = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
        editStartTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
      } else {
        editStartAt = '';
        editStartTime = '';
      }
      editDurationMinutes = task.duration_minutes ?? null;
      editIsRecurring = task.is_recurring;
      editRecurrenceRule = task.recurrence_rule;
      newItemLabel = '';
      prevPriority = task.priority;
      prevStatus = task.status;
      prevIsRecurring = task.is_recurring;
      prevRecurrenceRule = JSON.stringify(task.recurrence_rule);
      // Progressive disclosure: auto-expand fields that have values, but only when switching to a new task
      if (task.id !== initializedTaskId) {
        notesExpanded     = !!(task.notes && task.notes.trim() !== '');
        showTime          = editDueAt !== '' && editDueTime !== '';
        showReminder      = reminderDate !== '';
        showTimeBlock     = editStartAt !== '';
        showRecurring     = editIsRecurring;
        checklistExpanded = (task.checklist_items?.length ?? 0) > 0;
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
    if (!isInitialized || !task || editTitle === task.title) return;
    autoSave({ title: editTitle });
  }

  function handleNotesBlur() {
    if (!isInitialized || !task || editNotes === (task.notes ?? '')) return;
    autoSave({ notes: editNotes || null });
  }

  function handleDueBlur() {
    if (!isInitialized || !task) return;
    const newDueAt = buildDueAt(editDueAt, editDueTime) ?? null;
    const currentDueAt = task.due_at ?? null;
    if (newDueAt !== currentDueAt) autoSave({ due_at: newDueAt });
  }

  function handleReminderBlur() {
    if (!isInitialized || !task) return;
    let newVal: string | null = null;
    if (reminderDate) {
      const d = new Date(reminderDate);
      if (reminderTime) {
        const [hh, mm] = reminderTime.split(':').map(Number);
        d.setHours(hh, mm, 0, 0);
      }
      newVal = d.toISOString();
    }
    const currentVal = task.reminder_at ?? null;
    if (newVal !== currentVal) autoSave({ reminder_at: newVal });
  }

  function handleStartAtBlur() {
    if (!isInitialized || !task) return;
    const newStartAt = editStartAt
      ? new Date(editStartAt + 'T' + (editStartTime || '12:00') + ':00').toISOString()
      : null;
    if (newStartAt !== (task.start_at ?? null)) autoSave({ start_at: newStartAt });
  }

  function handleDurationBlur() {
    if (!isInitialized || !task) return;
    if (editDurationMinutes !== (task.duration_minutes ?? null))
      autoSave({ duration_minutes: editDurationMinutes });
  }

  let startAtIso = $derived(
    editStartAt
      ? new Date(editStartAt + 'T' + (editStartTime || '12:00') + ':00').toISOString()
      : null
  );
  let timeBlockDisplay = $derived(formatTimeBlock(startAtIso, editDurationMinutes));

  function setReminderPreset(minutesBefore: number) {
    if (!editDueAt) return;
    const dueIso = buildDueAt(editDueAt, editDueTime);
    if (!dueIso) return;
    const dueDate = new Date(dueIso);
    dueDate.setMinutes(dueDate.getMinutes() - minutesBefore);
    reminderDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}T12:00:00.000Z`;
    reminderTime = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
    autoSave({ reminder_at: dueDate.toISOString() });
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
    class={isMd ? 'h-full overflow-y-auto w-[440px] px-6 pt-6' : 'max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pt-4'}
  >
    <SheetHeader class="px-0 pb-4 border-b border-border-divider">
      <div class="flex items-center justify-between">
        <SheetTitle class="font-accent text-xl tracking-tight">Task Details</SheetTitle>
        {#if saveState === 'saving'}
          <span class="save-badge save-badge--saving text-foreground-muted" aria-label="Saving">
            <Loader class="size-3.5 animate-spin" />
          </span>
        {:else if saveState === 'saved'}
          <span class="save-badge save-badge--saved text-status-done animate-[scale-in_0.15s_ease-out]" aria-label="Saved">
            <Check class="size-3.5" />
          </span>
        {:else if saveState === 'error'}
          <span class="save-badge save-badge--error text-destructive animate-[scale-in_0.15s_ease-out]" aria-label="Save failed">
            <AlertCircle class="size-3.5" />
          </span>
        {/if}
      </div>
      <SheetDescription class="sr-only">{isViewer ? 'View task details' : 'Edit task details'}</SheetDescription>
    </SheetHeader>

    {#if task && isViewer}
      <!-- View-only mode for viewers -->
      <div class="space-y-4 mt-2">
        <div>
          <span class="section-header-bold mb-3">Title</span>
          <p class="mt-1">{task.title}</p>
        </div>
        {#if task.notes}
          <div>
            <span class="section-header-bold mb-3">Notes</span>
            <p class="mt-1 text-sm whitespace-pre-wrap">{task.notes}</p>
          </div>
        {/if}
        <div class="flex gap-4">
          <div>
            <span class="section-header-bold mb-3">Priority</span>
            <p class="mt-1 text-sm">{getPriorityLabel(task.priority)}</p>
          </div>
          <div>
            <span class="section-header-bold mb-3">Status</span>
            <p class="mt-1 text-sm">{formatStatus(task.status)}</p>
          </div>
        </div>
        {#if task.due_at}
          <div>
            <span class="section-header-bold mb-3">Due date</span>
            <p class="mt-1 text-sm">{new Date(task.due_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        {/if}
        {#if task.start_at}
          <div>
            <span class="section-header-bold mb-3">Time block</span>
            <p class="mt-1 text-sm">{formatTimeBlock(task.start_at, task.duration_minutes) ?? ''}</p>
          </div>
        {/if}
        {#if (task.checklist_items ?? []).length > 0}
          <div class="border-t pt-4">
            <span class="section-header-bold mb-3">Checklist</span>
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
                  <span class="text-sm {item.is_completed ? 'line-through text-foreground-muted' : ''}">{item.label}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else if task}
      <div class="space-y-4 mt-2">

        <!-- Title -->
        <div>
          <label for="edit-title" class="text-sm font-semibold tracking-wide text-foreground">Title</label>
          <input
            id="edit-title"
            name="title"
            type="text"
            bind:value={editTitle}
            required
            onblur={handleTitleBlur}
            class="select-input mt-1 text-base font-medium"
          />
        </div>

        <!-- Notes -->
        <div>
          <button
            type="button"
            class="flex items-center justify-between w-full group"
            onclick={() => { notesExpanded = !notesExpanded; }}
            aria-expanded={notesExpanded}
            aria-controls="notes-body"
          >
            <span class="text-sm font-semibold tracking-wide text-foreground">Notes</span>
            <div class="flex items-center gap-2">
              {#if !notesExpanded && editNotes}
                <span class="text-xs text-foreground-secondary truncate max-w-40">{editNotes.slice(0, 40)}{editNotes.length > 40 ? '…' : ''}</span>
              {/if}
              <svg class="w-4 h-4 text-foreground-muted transition-transform duration-200 {notesExpanded ? 'rotate-0' : '-rotate-90'}"
                viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
          </button>
          {#if notesExpanded}
            <div id="notes-body" transition:slide={{ duration: 180, easing: cubicOut }}>
              <textarea
                id="edit-notes"
                name="notes"
                bind:value={editNotes}
                rows="4"
                placeholder="Add context, links, or extra detail..."
                onblur={handleNotesBlur}
                class="select-input mt-1 resize-y min-h-22.5"
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- Metadata zone (priority, status, due, reminder, recurrence) -->
        <div class="border-t border-border-divider pt-5 space-y-4">

          <p class="section-header-bold mb-3">Details</p>

          <!-- Priority + Status row -->
          <div class="flex gap-3">
            <div class="flex-1">
              <label for="edit-priority" class="text-sm font-semibold tracking-wide text-foreground">Priority</label>
              <select
                id="edit-priority"
                name="priority"
                bind:value={editPriority}
                class="select-input mt-1"
              >
                <option value={1}>P1 — Urgent</option>
                <option value={2}>P2 — High</option>
                <option value={3}>P3 — Medium</option>
                <option value={4}>P4 — Low</option>
              </select>
            </div>
            <div class="flex-1">
              <label for="edit-status" class="text-sm font-semibold tracking-wide text-foreground">Status</label>
              <select
                id="edit-status"
                name="status"
                bind:value={editStatus}
                class="select-input mt-1"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          <!-- Due date -->
          <div>
            <label for="edit-due" class="text-sm font-semibold tracking-wide text-foreground">Due date</label>
            <input
              id="edit-due"
              name="due_at"
              type="date"
              bind:value={editDueAt}
              onchange={() => { if (!editDueAt) { editDueTime = ''; handleDueBlur(); } }}
              onblur={handleDueBlur}
              class="select-input mt-1"
            />
            {#if editDueAt && showTime}
              <label for="edit-due-time" class="text-sm font-semibold tracking-wide text-foreground mt-3 block">
                Time <span class="text-foreground-muted font-normal">(optional)</span>
              </label>
              <TimeInput id="edit-due-time" bind:value={editDueTime} disabled={isViewer} onchange={handleDueBlur} />
            {/if}
          </div>

          <!-- Progressive disclosure pills -->
          {#if showPillRow}
            <div class="flex gap-2 flex-wrap">
              {#if showTimePill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showTime = true; }}
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-8"
                  aria-label="Add a specific time"
                >+ Time</button>
              {/if}
              {#if showReminderPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showReminder = true; }}
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-8"
                  aria-label="Add a reminder"
                >+ Reminder</button>
              {/if}
              {#if showTimeBlockPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showTimeBlock = true; }}
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-8"
                  aria-label="Schedule a time block"
                >+ Time Block</button>
              {/if}
              {#if showRecurringPill}
                <button
                  transition:scale={{ duration: 120, start: 0.85 }}
                  type="button"
                  onclick={() => { showRecurring = true; editIsRecurring = true; }}
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-8"
                  aria-label="Make this task recurring"
                >+ Recurring</button>
              {/if}
            </div>
          {/if}

          <!-- Reminder -->
          {#if showReminder}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <div class="flex items-center justify-between">
                <label for="edit-reminder-time" class="text-sm font-semibold tracking-wide text-foreground">Reminder</label>
                {#if !isViewer}
                  <button
                    type="button"
                    class="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors p-1 rounded hover:bg-surface-subtle"
                    aria-label="Remove reminder"
                    onclick={() => {
                      if (reminderDate) autoSave({ reminder_at: null });
                      reminderDate = ''; reminderTime = ''; showReminder = false;
                    }}
                  >&times;</button>
                {/if}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <DatePickerPopover
                  bind:value={reminderDate}
                  mode="controlled"
                  disabled={isViewer}
                  onchange={handleReminderBlur}
                />
                <TimeInput
                  id="edit-reminder-time"
                  bind:value={reminderTime}
                  disabled={isViewer || !reminderDate}
                  onchange={handleReminderBlur}
                />
              </div>
              {#if editDueAt}
                <p class="text-xs text-foreground-muted mt-2 mb-1">Relative to due date:</p>
                <div class="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-11 flex items-center font-medium"
                    aria-label="Set reminder 10 minutes before due date"
                    onclick={() => setReminderPreset(10)}
                  >10 min</button>
                  <button
                    type="button"
                    class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-11 flex items-center font-medium"
                    aria-label="Set reminder 1 hour before due date"
                    onclick={() => setReminderPreset(60)}
                  >1 hr</button>
                  <button
                    type="button"
                    class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-11 flex items-center font-medium"
                    aria-label="Set reminder 1 day before due date"
                    onclick={() => setReminderPreset(1440)}
                  >1 day</button>
                </div>
              {/if}
              {#if reminderDate}
                <button
                  type="button"
                  class="text-sm text-destructive mt-1 px-2 py-2 rounded min-h-11 flex items-center hover:bg-destructive/10 transition-colors"
                  onclick={() => { reminderDate = ''; reminderTime = ''; showReminder = false; autoSave({ reminder_at: null }); }}
                >Clear reminder</button>
              {/if}
            </div>
          {/if}

          <!-- Time Block -->
          {#if showTimeBlock}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <label for="edit-start-date" class="text-sm font-semibold tracking-wide text-foreground">
                Time block <span class="text-foreground-muted font-normal">(optional)</span>
              </label>
              <input
                id="edit-start-date"
                name="start_at_date"
                type="date"
                bind:value={editStartAt}
                onchange={() => { if (!editStartAt) { editStartTime = ''; handleStartAtBlur(); } }}
                onblur={handleStartAtBlur}
                class="select-input mt-1"
              />
              {#if editStartAt}
                <label for="edit-start-time" class="text-sm font-semibold tracking-wide text-foreground mt-3 block">
                  Start time <span class="text-foreground-muted font-normal">(optional)</span>
                </label>
                <TimeInput id="edit-start-time" bind:value={editStartTime} disabled={isViewer} onchange={handleStartAtBlur} />
                <label for="edit-duration" class="text-sm font-semibold tracking-wide text-foreground mt-3 block">
                  Duration <span class="text-foreground-muted font-normal">(optional)</span>
                </label>
                <div class="flex gap-2 flex-wrap mt-1 mb-2">
                  {#each [15, 30, 60, 90, 120] as preset}
                    <button
                      type="button"
                      class="text-xs px-3 py-1.5 rounded-full border transition-colors min-h-9 flex items-center font-medium
                        {editDurationMinutes === preset
                          ? 'border-primary bg-primary-tint text-primary'
                          : 'border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30'}"
                      onclick={() => { editDurationMinutes = preset; autoSave({ duration_minutes: preset }); }}
                    >
                      {preset < 60 ? `${preset} min` : `${preset / 60} hr`}
                    </button>
                  {/each}
                </div>
                <input
                  id="edit-duration"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom (minutes)"
                  bind:value={editDurationMinutes}
                  onblur={handleDurationBlur}
                  class="select-input"
                />
                {#if editDurationMinutes}
                  <button
                    type="button"
                    class="text-xs text-destructive mt-1 px-2 py-2 rounded min-h-11 flex items-center hover:bg-destructive/10 transition-colors"
                    onclick={() => { editDurationMinutes = null; autoSave({ duration_minutes: null }); }}
                  >Clear duration</button>
                {/if}
                {#if timeBlockDisplay}
                  <div class="text-sm text-foreground-secondary bg-surface-subtle rounded-md px-3 py-2 mt-2">
                    <span class="font-medium text-foreground">Scheduled: </span>{timeBlockDisplay}
                  </div>
                {/if}
              {/if}
              <button
                type="button"
                class="text-xs text-destructive mt-1 px-2 py-2 rounded min-h-11 flex items-center hover:bg-destructive/10 transition-colors"
                onclick={() => { editStartAt = ''; editStartTime = ''; editDurationMinutes = null; showTimeBlock = false; autoSave({ start_at: null, duration_minutes: null }); }}
              >Clear time block</button>
            </div>
          {/if}

          <!-- Recurrence -->
          {#if showRecurring}
            <div transition:slide={{ duration: 180, easing: cubicOut }}>
              <RecurrenceEditor bind:isRecurring={editIsRecurring} bind:recurrenceRule={editRecurrenceRule} onclose={() => { editIsRecurring = false; showRecurring = false; }} />
            </div>
          {/if}

        </div><!-- end metadata zone -->

      </div>

      <!-- Assign to (only for shared lists with >1 member, hidden for viewers) -->
      {#if members.length > 1 && !isViewer}
        <div class="mt-4 pt-4 border-t">
          <form
            method="POST"
            action="?/assignTask"
            use:enhance={() => {
              return async ({ result, update }) => {
                if (result.type === 'success') {
                  toast.success('Assignment updated');
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="id" value={task.id} />
            <label for="assign-to" class="text-sm font-medium">Assign to</label>
            <select
              id="assign-to"
              name="assigned_to_user_id"
              class="select-input mt-1"
              value={task.assigned_to_user_id ?? ''}
              onchange={(e) => { e.currentTarget.form?.requestSubmit(); }}
            >
              <option value="">Unassigned</option>
              {#each members as member (member.user_id)}
                <option value={member.user_id}>
                  {member.profile?.display_name ?? member.profile?.email ?? member.user_id}
                </option>
              {/each}
            </select>
          </form>
        </div>
      {/if}

      <!-- Checklist Section -->
      <div class="mt-5 pt-5 border-t">
        <button
          type="button"
          class="flex items-center justify-between w-full mb-3 group"
          onclick={() => { checklistExpanded = !checklistExpanded; }}
          aria-expanded={checklistExpanded}
          aria-controls="checklist-body"
        >
          <span class="section-header-bold">Checklist</span>
          <div class="flex items-center gap-2">
            {#if !checklistExpanded && totalCount > 0}
              <span class="text-xs {completedCount === totalCount ? 'text-green-600 font-medium' : 'text-foreground-secondary'}">
                {completedCount === totalCount ? 'All done ✓' : completedCount > 0 ? `${completedCount}/${totalCount} done` : `${totalCount} item${totalCount === 1 ? '' : 's'}`}
              </span>
            {/if}
            <svg
              class="w-4 h-4 text-foreground-muted transition-transform duration-200 {checklistExpanded ? 'rotate-0' : '-rotate-90'}"
              viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </button>

        <div id="checklist-body" class="checklist-body {checklistExpanded ? 'checklist-body--open' : ''}">
        <div>

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
          >
            <div
              class="h-full rounded-full transition-all duration-300 {completedCount === totalCount ? 'bg-status-done' : 'bg-primary'}"
              style="width: {(completedCount / totalCount) * 100}%"
            ></div>
          </div>
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
                  toast.error('Failed to reorder items');
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="item_ids" value="" />
          </form>
          <div class="space-y-1 mb-3">
            {#each checklistItems as item (item.id)}
              <div
                class="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-primary-tint/60 transition-colors {draggingId === item.id ? 'opacity-50' : ''} {dragOverId === item.id && draggingId !== item.id ? 'ring-1 ring-primary' : ''}"
                draggable={!hasPendingItems}
                ondragstart={() => onDragStart(item.id)}
                ondragover={(e) => onDragOver(e, item.id)}
                ondrop={() => onDrop(item.id)}
                ondragend={onDragEnd}
              >
                <!-- Drag handle -->
                <button
                  type="button"
                  class="md:opacity-0 md:group-hover:opacity-100 shrink-0 text-foreground-muted transition-opacity {hasPendingItems ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}"
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
                          toast.success('Recurring task rolled to next occurrence');
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
                          toast.error('Failed to update item');
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
                    class="md:opacity-0 md:group-hover:opacity-100 p-1.5 min-w-11 min-h-11 flex items-center justify-center text-foreground-muted hover:text-destructive transition-opacity"
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

        </div><!-- end checklist-body inner -->
        </div><!-- end checklist-body -->
      </div>

      <!-- Delete (separate form) -->
      <div class="mt-4 pt-4 border-t">
        <AlertDialog.Root bind:open={deleteAlertOpen}>
          <AlertDialog.Trigger>
            <button
              type="button"
              class="w-full rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-colors disabled:opacity-50"
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Delete task'}
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete task?</AlertDialog.Title>
              <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <form
                method="POST"
                action="?/deleteTask"
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
                  class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                  disabled={deleting}
                >
                  Delete
                </button>
              </form>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    {/if}
  </SheetContent>
</Sheet>

<style>
  .checklist-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .checklist-body > div {
    overflow: hidden;
  }
  .checklist-body--open {
    grid-template-rows: 1fr;
  }
</style>
