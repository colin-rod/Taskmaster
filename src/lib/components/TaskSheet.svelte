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
  import { hasTime, buildDueAt } from '$lib/utils/dates.js';
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';
  import { Plus, Loader, Check, AlertCircle } from '@lucide/svelte';
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
  let editReminderAt = $state('');
  let editIsRecurring = $state(false);
  let editRecurrenceRule = $state<RecurrenceRule | null>(null);
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
      editReminderAt = task.reminder_at
        ? new Date(task.reminder_at).toISOString().slice(0, 16)
        : '';
      editIsRecurring = task.is_recurring;
      editRecurrenceRule = task.recurrence_rule;
      newItemLabel = '';
      prevPriority = task.priority;
      prevStatus = task.status;
      prevIsRecurring = task.is_recurring;
      prevRecurrenceRule = JSON.stringify(task.recurrence_rule);
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
    const newVal = editReminderAt ? new Date(editReminderAt).toISOString() : null;
    const currentVal = task.reminder_at ?? null;
    if (newVal !== currentVal) autoSave({ reminder_at: newVal });
  }

  function setReminderPreset(minutesBefore: number) {
    if (!editDueAt) return;
    const dueIso = buildDueAt(editDueAt, editDueTime);
    if (!dueIso) return;
    const dueDate = new Date(dueIso);
    dueDate.setMinutes(dueDate.getMinutes() - minutesBefore);
    editReminderAt = dueDate.toISOString().slice(0, 16);
    autoSave({ reminder_at: dueDate.toISOString() });
  }

  let checklistItems = $derived(
    (task?.checklist_items ?? []).slice().sort((a, b) => a.position - b.position)
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
          <span class="section-header-bold">Title</span>
          <p class="mt-1">{task.title}</p>
        </div>
        {#if task.notes}
          <div>
            <span class="section-header-bold">Notes</span>
            <p class="mt-1 text-sm whitespace-pre-wrap">{task.notes}</p>
          </div>
        {/if}
        <div class="flex gap-4">
          <div>
            <span class="section-header-bold">Priority</span>
            <p class="mt-1 text-sm">{getPriorityLabel(task.priority)}</p>
          </div>
          <div>
            <span class="section-header-bold">Status</span>
            <p class="mt-1 text-sm">{formatStatus(task.status)}</p>
          </div>
        </div>
        {#if task.due_at}
          <div>
            <span class="section-header-bold">Due date</span>
            <p class="mt-1 text-sm">{new Date(task.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        {/if}
        {#if (task.checklist_items ?? []).length > 0}
          <div class="border-t pt-4">
            <span class="section-header-bold">Checklist</span>
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
          <label for="edit-notes" class="text-sm font-semibold tracking-wide text-foreground">Notes</label>
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

        <!-- Metadata zone (priority, status, due, reminder, recurrence) -->
        <div class="border-t border-border-divider pt-5 space-y-4">

          <p class="section-header-bold">Details</p>

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
            {#if editDueAt}
              <label for="edit-due-time" class="text-sm font-semibold tracking-wide text-foreground mt-3 block">
                Time <span class="text-foreground-muted font-normal">(optional)</span>
              </label>
              <input
                id="edit-due-time"
                name="due_time"
                type="time"
                bind:value={editDueTime}
                onblur={handleDueBlur}
                class="select-input mt-1"
              />
            {/if}
          </div>

          <!-- Reminder -->
          <div>
            <label for="edit-reminder" class="text-sm font-semibold tracking-wide text-foreground">Reminder</label>
            <input
              id="edit-reminder"
              name="reminder_at"
              type="datetime-local"
              bind:value={editReminderAt}
              onblur={handleReminderBlur}
              class="select-input mt-1"
            />
            {#if editDueAt}
              <p class="text-xs text-foreground-muted mt-2 mb-1">Relative to due date:</p>
              <div class="flex gap-2 flex-wrap">
                <button
                  type="button"
                  class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-9 flex items-center font-medium"
                  onclick={() => setReminderPreset(10)}
                >10 min</button>
                <button
                  type="button"
                  class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-9 flex items-center font-medium"
                  onclick={() => setReminderPreset(60)}
                >1 hr</button>
                <button
                  type="button"
                  class="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-foreground-secondary hover:bg-primary-tint hover:text-primary hover:border-primary/30 transition-colors min-h-9 flex items-center font-medium"
                  onclick={() => setReminderPreset(1440)}
                >1 day</button>
              </div>
            {/if}
            {#if editReminderAt}
              <button
                type="button"
                class="text-xs text-destructive mt-1 px-2 py-2 rounded min-h-11 flex items-center hover:bg-destructive/10 transition-colors"
                onclick={() => { editReminderAt = ''; autoSave({ reminder_at: null }); }}
              >Clear reminder</button>
            {/if}
          </div>

          <!-- Recurrence -->
          <RecurrenceEditor bind:isRecurring={editIsRecurring} bind:recurrenceRule={editRecurrenceRule} />

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
        <div class="flex items-center justify-between mb-3">
          <span class="section-header-bold" style="margin-bottom:0">Checklist</span>
          {#if totalCount > 0}
            <span class="text-xs {completedCount === totalCount && totalCount > 0 ? 'text-green-600 font-medium' : 'text-foreground-secondary'}">
              {completedCount === totalCount && totalCount > 0 ? 'All done ✓' : `${completedCount}/${totalCount}`}
            </span>
          {/if}
        </div>

        <!-- Progress bar -->
        {#if totalCount > 0}
          <div class="h-2 rounded-full bg-surface-subtle mb-3 overflow-hidden" class:progress-finish={checklistJustFinished}>
            <div
              class="h-full rounded-full transition-all duration-300 {completedCount === totalCount ? 'bg-status-done' : 'bg-primary'}"
              style="width: {(completedCount / totalCount) * 100}%"
            ></div>
          </div>
        {/if}

        <!-- Checklist items -->
        {#if checklistItems.length > 0}
          <div class="space-y-1 mb-3">
            {#each checklistItems as item (item.id)}
              <div class="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-primary-tint/60 transition-colors">
                <!-- Toggle -->
                <form
                  method="POST"
                  action="?/toggleChecklistItem"
                  use:enhance={() => {
                    const wasCompleted = item.is_completed;
                    item.is_completed = !item.is_completed;
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        toast.success(wasCompleted ? 'Item unchecked' : 'Item checked');
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
                    class="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
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

                <!-- Label -->
                <span class="flex-1 text-sm {item.is_completed ? 'line-through text-foreground-muted' : ''}">
                  {item.label}
                </span>

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
