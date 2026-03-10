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
  import type { Task } from '$lib/types/index.js';
  import { getPriorityLabel, formatStatus } from '$lib/utils/design-tokens.js';

  let {
    task = $bindable<Task | null>(null),
    open = $bindable(false),
  }: {
    task: Task | null;
    open: boolean;
  } = $props();

  let editTitle = $state('');
  let editNotes = $state('');
  let editPriority = $state(4);
  let editDueAt = $state('');
  let editStatus = $state('todo');
  let saving = $state(false);
  let deleting = $state(false);

  $effect(() => {
    if (task) {
      editTitle = task.title;
      editNotes = task.notes || '';
      editPriority = task.priority;
      editDueAt = task.due_at ? task.due_at.split('T')[0] : '';
      editStatus = task.status;
    }
  });

  function formatDueValue(dateStr: string): string | null {
    if (!dateStr) return null;
    return new Date(dateStr + 'T12:00:00').toISOString();
  }
</script>

<Sheet bind:open>
  <SheetContent side="bottom" class="max-h-[85vh] overflow-y-auto rounded-t-xl">
    <SheetHeader>
      <SheetTitle>Edit Task</SheetTitle>
      <SheetDescription class="sr-only">Edit task details</SheetDescription>
    </SheetHeader>

    {#if task}
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
