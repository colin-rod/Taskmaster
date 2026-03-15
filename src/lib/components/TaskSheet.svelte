<script lang="ts">
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
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';

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
  let editStatus = $state('todo');
  let saving = $state(false);
  let deleting = $state(false);
  let newItemLabel = $state('');
  let addingItem = $state(false);
  let editReminderAt = $state('');
  let editIsRecurring = $state(false);
  let editRecurrenceRule = $state<RecurrenceRule | null>(null);

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
      editTitle = task.title;
      editNotes = task.notes || '';
      editPriority = task.priority;
      editDueAt = task.due_at ? task.due_at.split('T')[0] : '';
      editStatus = task.status;
      editReminderAt = task.reminder_at
        ? new Date(task.reminder_at).toISOString().slice(0, 16)
        : '';
      editIsRecurring = task.is_recurring;
      editRecurrenceRule = task.recurrence_rule;
      newItemLabel = '';
    }
  });

  let checklistItems = $derived(
    (task?.checklist_items ?? []).slice().sort((a, b) => a.position - b.position)
  );
  let completedCount = $derived(checklistItems.filter((i) => i.is_completed).length);
  let totalCount = $derived(checklistItems.length);

  function setReminderPreset(minutesBefore: number) {
    if (!editDueAt) return;
    const dueDate = new Date(editDueAt + 'T12:00:00');
    dueDate.setMinutes(dueDate.getMinutes() - minutesBefore);
    editReminderAt = dueDate.toISOString().slice(0, 16);
  }
</script>

<Sheet bind:open>
  <SheetContent
    side={isMd ? 'right' : 'bottom'}
    class={isMd ? 'h-full overflow-y-auto w-[420px] px-5' : 'max-h-[85vh] overflow-y-auto rounded-t-xl px-5'}
  >
    <SheetHeader class="px-0">
      <SheetTitle>{isViewer ? 'Task Details' : 'Edit Task'}</SheetTitle>
      <SheetDescription class="sr-only">{isViewer ? 'View task details' : 'Edit task details'}</SheetDescription>
    </SheetHeader>

    {#if task && isViewer}
      <!-- View-only mode for viewers -->
      <div class="space-y-4 mt-2">
        <div>
          <span class="text-sm font-medium text-foreground-secondary">Title</span>
          <p class="mt-1">{task.title}</p>
        </div>
        {#if task.notes}
          <div>
            <span class="text-sm font-medium text-foreground-secondary">Notes</span>
            <p class="mt-1 text-sm whitespace-pre-wrap">{task.notes}</p>
          </div>
        {/if}
        <div class="flex gap-4">
          <div>
            <span class="text-sm font-medium text-foreground-secondary">Priority</span>
            <p class="mt-1 text-sm">{getPriorityLabel(task.priority)}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-foreground-secondary">Status</span>
            <p class="mt-1 text-sm">{formatStatus(task.status)}</p>
          </div>
        </div>
        {#if task.due_at}
          <div>
            <span class="text-sm font-medium text-foreground-secondary">Due date</span>
            <p class="mt-1 text-sm">{new Date(task.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        {/if}
        {#if (task.checklist_items ?? []).length > 0}
          <div class="border-t pt-4">
            <span class="text-sm font-medium">Checklist</span>
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
      <form
        method="POST"
        action="?/updateTask"
        class="space-y-4 mt-2"
        use:enhance={() => {
          saving = true;
          return async ({ result, update }) => {
            saving = false;
            if (result.type === 'success') {
              open = false;
              toast.success('Task updated');
            }
            await update();
          };
        }}
      >
        <input type="hidden" name="id" value={task.id} />

        <!-- Title -->
        <div>
          <label for="edit-title" class="text-sm font-medium">Title</label>
          <input
            id="edit-title"
            name="title"
            type="text"
            bind:value={editTitle}
            required
            class="select-input mt-1"
          />
        </div>

        <!-- Notes -->
        <div>
          <label for="edit-notes" class="text-sm font-medium">Notes</label>
          <textarea
            id="edit-notes"
            name="notes"
            bind:value={editNotes}
            rows="3"
            placeholder="Add notes..."
            class="select-input mt-1 resize-y"
          ></textarea>
        </div>

        <!-- Priority + Status row -->
        <div class="flex gap-3">
          <div class="flex-1">
            <label for="edit-priority" class="text-sm font-medium">Priority</label>
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
            <label for="edit-status" class="text-sm font-medium">Status</label>
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
          <label for="edit-due" class="text-sm font-medium">Due date</label>
          <input
            id="edit-due"
            name="due_at"
            type="date"
            bind:value={editDueAt}
            class="select-input mt-1"
          />
        </div>

        <!-- Reminder -->
        <div>
          <label for="edit-reminder" class="text-sm font-medium">Reminder</label>
          <input
            id="edit-reminder"
            name="reminder_at"
            type="datetime-local"
            bind:value={editReminderAt}
            class="select-input mt-1"
          />
          {#if editDueAt}
            <div class="flex gap-2 mt-1.5 flex-wrap">
              <button
                type="button"
                class="text-xs px-2 py-0.5 rounded bg-surface-subtle text-foreground-secondary hover:text-foreground"
                onclick={() => setReminderPreset(10)}
              >10m before</button>
              <button
                type="button"
                class="text-xs px-2 py-0.5 rounded bg-surface-subtle text-foreground-secondary hover:text-foreground"
                onclick={() => setReminderPreset(60)}
              >1h before</button>
              <button
                type="button"
                class="text-xs px-2 py-0.5 rounded bg-surface-subtle text-foreground-secondary hover:text-foreground"
                onclick={() => setReminderPreset(1440)}
              >1 day before</button>
            </div>
          {/if}
          {#if editReminderAt}
            <button
              type="button"
              class="text-xs text-destructive mt-1"
              onclick={() => { editReminderAt = ''; }}
            >Clear reminder</button>
          {/if}
        </div>

        <!-- Recurrence -->
        <RecurrenceEditor bind:isRecurring={editIsRecurring} bind:recurrenceRule={editRecurrenceRule} />
        <input type="hidden" name="is_recurring" value={String(editIsRecurring)} />
        <input type="hidden" name="recurrence_rule" value={editIsRecurring && editRecurrenceRule ? JSON.stringify(editRecurrenceRule) : ''} />

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            type="submit"
            class="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            disabled={saving || !editTitle.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

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
      <div class="mt-4 pt-4 border-t">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Checklist</span>
          {#if totalCount > 0}
            <span class="text-xs text-foreground-secondary">{completedCount}/{totalCount}</span>
          {/if}
        </div>

        <!-- Progress bar -->
        {#if totalCount > 0}
          <div class="h-1.5 rounded-full bg-surface-subtle mb-3 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300 {completedCount === totalCount ? 'bg-[hsl(var(--status-done))]' : 'bg-primary'}"
              style="width: {(completedCount / totalCount) * 100}%"
            ></div>
          </div>
        {/if}

        <!-- Checklist items -->
        {#if checklistItems.length > 0}
          <div class="space-y-1 mb-3">
            {#each checklistItems as item (item.id)}
              <div class="flex items-center gap-2 group rounded-md px-1 py-1 hover:bg-surface-subtle">
                <!-- Toggle -->
                <form
                  method="POST"
                  action="?/toggleChecklistItem"
                  use:enhance={() => {
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        toast.success(item.is_completed ? 'Item unchecked' : 'Item checked');
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
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        toast.success('Item removed');
                      }
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    class="opacity-0 group-hover:opacity-100 p-0.5 text-foreground-muted hover:text-destructive transition-opacity"
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
            return async ({ result, update }) => {
              addingItem = false;
              if (result.type === 'success') {
                newItemLabel = '';
              }
              await update();
            };
          }}
        >
          <input type="hidden" name="task_id" value={task.id} />
          <svg class="w-4 h-4 text-foreground-muted flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3v10M3 8h10" />
          </svg>
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
      <form
        method="POST"
        action="?/deleteTask"
        class="mt-3 pt-3 border-t"
        use:enhance={() => {
          deleting = true;
          return async ({ result, update }) => {
            deleting = false;
            if (result.type === 'success') {
              open = false;
              task = null;
              toast.success('Task deleted');
            }
            await update();
          };
        }}
      >
        <input type="hidden" name="id" value={task.id} />
        <button
          type="submit"
          class="w-full rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          disabled={deleting}
          onclick={(e) => { if (!confirm('Delete this task?')) e.preventDefault(); }}
        >
          {deleting ? 'Deleting...' : 'Delete Task'}
        </button>
      </form>
    {/if}
  </SheetContent>
</Sheet>
