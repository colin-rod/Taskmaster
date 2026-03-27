<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { PRIORITY_OPTIONS } from '$lib/utils/design-tokens.js';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';
  import { Bell, Tag, X } from '@lucide/svelte';
  import type { RecurrenceRule, Label } from '$lib/types/index.js';

  let { action = '?/createTask', compact = false, listId = null as string | null, onClose }: { action?: string; compact?: boolean; listId?: string | null; onClose?: () => void } = $props();

  let titleInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (compact && titleInput) {
      titleInput.focus();
    }
  });

  let title = $state('');
  let dueAt = $state<string | null>(null);
  let priority = $state(4);
  let creating = $state(false);
  let justAdded = $state(false);
  let addedTimeout: ReturnType<typeof setTimeout>;
  let priorityPopoverOpen = $state(false);
  let recurrencePopoverOpen = $state(false);
  let isRecurring = $state(false);
  let recurrenceRule = $state<RecurrenceRule | null>(null);

  // Reminder state
  let reminderEnabled = $state(false);
  let reminderAt = $derived.by(() => {
    if (!reminderEnabled || !dueAt) return null;
    const d = new Date(dueAt);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  });

  // Auto-disable reminder when due date is cleared
  $effect(() => {
    if (!dueAt) reminderEnabled = false;
  });

  // Label state
  let labelPopoverOpen = $state(false);
  let allLabels = $state<Label[]>([]);
  let selectedLabels = $state<Label[]>([]);
  let labelSearch = $state('');
  let labelsLoading = $state(false);

  let filteredLabels = $derived(
    allLabels.filter(
      (l) => l.name.toLowerCase().includes(labelSearch.toLowerCase()) &&
             !selectedLabels.some((s) => s.id === l.id)
    )
  );

  async function fetchLabels() {
    labelsLoading = true;
    try {
      const res = await fetch(listId ? `/api/labels?list_id=${listId}` : '/api/labels');
      if (res.ok) {
        const data = await res.json();
        allLabels = data.labels;
      }
    } finally {
      labelsLoading = false;
    }
  }

  $effect(() => {
    if (labelPopoverOpen) {
      fetchLabels();
      labelSearch = '';
    }
  });

  let currentPriority = $derived(PRIORITY_OPTIONS.find((p) => p.level === priority)!);
</script>

<form
  method="POST"
  {action}
  class={compact ? 'flex flex-col gap-2 w-full' : 'flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm'}
  class:form-success={justAdded}
  use:enhance={() => {
    creating = true;
    return async ({ result, update }) => {
      creating = false;
      if (result.type === 'success') {
        const taskId = (result.data as { taskId?: string })?.taskId;

        // Attach selected labels via API
        if (taskId && selectedLabels.length > 0) {
          await Promise.all(
            selectedLabels.map((label) =>
              fetch(`/api/tasks/${taskId}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label_id: label.id }),
              })
            )
          );
        }

        title = '';
        dueAt = null;
        priority = 4;
        priorityPopoverOpen = false;
        recurrencePopoverOpen = false;
        isRecurring = false;
        recurrenceRule = null;
        reminderEnabled = false;
        selectedLabels = [];
        labelPopoverOpen = false;
        toast.success('Task added');
        onClose?.();
        justAdded = true;
        clearTimeout(addedTimeout);
        addedTimeout = setTimeout(() => { justAdded = false; }, 500);
      }
      await update();
    };
  }}
>
  <!-- Mobile: two-row layout / Desktop: single row -->
  <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
    <input
      id="quick-add-title"
      name="title"
      type="text"
      bind:this={titleInput}
      bind:value={title}
      placeholder="Add a task..."
      required
      class="select-input w-full md:flex-1"
      disabled={creating}
      onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); }}
    />

    <input type="hidden" name="due_at" value={dueAt ?? ''} />
    <input type="hidden" name="priority" value={priority} />
    <input type="hidden" name="is_recurring" value={isRecurring ? 'true' : ''} />
    <input type="hidden" name="recurrence_rule" value={recurrenceRule ? JSON.stringify(recurrenceRule) : ''} />
    <input type="hidden" name="reminder_at" value={reminderAt ?? ''} />

    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <!-- Date picker -->
        <DatePickerPopover bind:value={dueAt} mode="controlled" disabled={creating} />

        <!-- Repeat popover -->
        <Popover.Root bind:open={recurrencePopoverOpen}>
          <Popover.Trigger disabled={creating}>
            <button
              type="button"
              class="text-sm px-1.5 py-0.5 rounded transition-colors {isRecurring ? 'text-primary font-medium' : 'text-foreground-secondary hover:text-foreground'}"
              title="Set recurrence"
            >
              ↻
            </button>
          </Popover.Trigger>
          <Popover.Content class="w-72 p-4" align="start">
            <RecurrenceEditor
              bind:isRecurring
              bind:recurrenceRule
              onclose={() => { recurrencePopoverOpen = false; isRecurring = false; recurrenceRule = null; }}
            />
          </Popover.Content>
        </Popover.Root>

        <!-- Priority popover -->
        <Popover.Root bind:open={priorityPopoverOpen}>
          <Popover.Trigger disabled={creating}>
            <span
              class="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-subtle cursor-pointer hover:bg-border transition-colors {currentPriority.color}"
            >
              {currentPriority.label}
            </span>
          </Popover.Trigger>
          <Popover.Content class="w-36 p-1" align="start">
            {#each PRIORITY_OPTIONS as p (p.level)}
              <button
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
                  {p.level === priority ? 'bg-surface-subtle font-medium' : ''}"
                onclick={() => { priority = p.level; priorityPopoverOpen = false; }}
              >
                <span class="font-medium {p.color}">{p.label}</span>
                <span class="text-foreground-secondary">{p.desc}</span>
              </button>
            {/each}
          </Popover.Content>
        </Popover.Root>

        <!-- Reminder toggle -->
        <button
          type="button"
          class="text-sm px-1.5 py-0.5 rounded transition-colors {reminderEnabled ? 'text-primary font-medium' : 'text-foreground-secondary hover:text-foreground'} disabled:opacity-40 disabled:cursor-not-allowed"
          title={reminderEnabled ? 'Reminder: 9am on due date' : 'Remind me (9am on due date)'}
          disabled={creating || !dueAt}
          onclick={() => { reminderEnabled = !reminderEnabled; }}
        >
          <Bell class="size-3.5" />
        </button>

        <!-- Label popover -->
        <Popover.Root bind:open={labelPopoverOpen}>
          <Popover.Trigger disabled={creating}>
            <span
              class="text-sm px-1.5 py-0.5 rounded cursor-pointer transition-colors
                {selectedLabels.length > 0 ? 'text-primary font-medium' : 'text-foreground-secondary hover:text-foreground'}"
            >
              <Tag class="size-3.5 inline" />
            </span>
          </Popover.Trigger>
          <Popover.Content class="w-56 p-1" align="start">
            <div class="px-2 pb-1">
              <input
                type="text"
                bind:value={labelSearch}
                placeholder="Search labels..."
                class="w-full text-sm bg-transparent border-b border-border outline-none py-1 placeholder:text-foreground-muted"
              />
            </div>
            {#if labelsLoading}
              <div class="px-2 py-2 text-xs text-foreground-muted">Loading...</div>
            {:else}
              <div class="max-h-48 overflow-y-auto">
                {#each filteredLabels as label (label.id)}
                  <button
                    type="button"
                    class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
                    onclick={() => { selectedLabels = [...selectedLabels, label]; labelPopoverOpen = false; }}
                  >
                    <span class="w-3 h-3 rounded-full flex-shrink-0" style="background: {label.color};"></span>
                    <span class="truncate">{label.name}</span>
                  </button>
                {/each}
              </div>
              {#if filteredLabels.length === 0}
                <div class="px-2 py-2 text-xs text-foreground-muted">No labels found</div>
              {/if}
            {/if}
          </Popover.Content>
        </Popover.Root>
      </div>

      <button
        type="submit"
        class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        disabled={creating || !title.trim()}
      >
        {creating ? 'Adding...' : 'Add'}
      </button>
    </div>
  </div>

  {#if selectedLabels.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each selectedLabels as label (label.id)}
        <span
          class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-white"
          style="background: {label.color};"
        >
          {label.name}
          <button
            type="button"
            class="hover:opacity-70"
            onclick={() => { selectedLabels = selectedLabels.filter((l) => l.id !== label.id); }}
            aria-label="Remove {label.name}"
          >
            <X class="size-3" />
          </button>
        </span>
      {/each}
    </div>
  {/if}

</form>
