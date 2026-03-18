<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { PRIORITY_OPTIONS } from '$lib/utils/design-tokens.js';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';
  import TimePickerPopover from '$lib/components/TimePickerPopover.svelte';
  import RecurrenceEditor from '$lib/components/RecurrenceEditor.svelte';
  import type { RecurrenceRule } from '$lib/types/index.js';

  let { action = '?/createTask' }: { action?: string } = $props();

  let title = $state('');
  let dueAt = $state<string | null>(null);
  let priority = $state(4);
  let creating = $state(false);
  let justAdded = $state(false);
  let addedTimeout: ReturnType<typeof setTimeout>;
  let priorityPopoverOpen = $state(false);
  let showRecurrence = $state(false);
  let isRecurring = $state(false);
  let recurrenceRule = $state<RecurrenceRule | null>(null);

  let currentPriority = $derived(PRIORITY_OPTIONS.find((p) => p.level === priority)!);
</script>

<form
  method="POST"
  {action}
  class="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm"
  class:form-success={justAdded}
  use:enhance={() => {
    creating = true;
    return async ({ result, update }) => {
      creating = false;
      if (result.type === 'success') {
        title = '';
        dueAt = null;
        priority = 4;
        priorityPopoverOpen = false;
        showRecurrence = false;
        isRecurring = false;
        recurrenceRule = null;
        toast.success('Task added');
        justAdded = true;
        clearTimeout(addedTimeout);
        addedTimeout = setTimeout(() => { justAdded = false; }, 500);
      }
      await update();
    };
  }}
>
  <div class="flex items-center gap-2">
    <input
      id="quick-add-title"
      name="title"
      type="text"
      bind:value={title}
      placeholder="Add a task..."
      required
      class="select-input flex-1"
      disabled={creating}
    />

    <input type="hidden" name="due_at" value={dueAt ?? ''} />
    <input type="hidden" name="priority" value={priority} />
    <input type="hidden" name="is_recurring" value={isRecurring ? 'true' : ''} />
    <input type="hidden" name="recurrence_rule" value={recurrenceRule ? JSON.stringify(recurrenceRule) : ''} />

    <!-- Date and time popovers -->
    <DatePickerPopover bind:value={dueAt} mode="controlled" disabled={creating} />
    <TimePickerPopover bind:value={dueAt} mode="controlled" disabled={creating} />

    <!-- Repeat toggle -->
    <button
      type="button"
      class="text-sm px-1.5 py-0.5 rounded transition-colors {showRecurrence ? 'text-primary font-medium' : 'text-foreground-secondary hover:text-foreground'}"
      onclick={() => {
        showRecurrence = !showRecurrence;
        if (!showRecurrence) {
          isRecurring = false;
          recurrenceRule = null;
        }
      }}
      disabled={creating}
      title="Set recurrence"
    >
      ↻
    </button>

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

    <button
      type="submit"
      class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      disabled={creating || !title.trim()}
    >
      {creating ? 'Adding...' : 'Add'}
    </button>
  </div>

  {#if showRecurrence}
    <RecurrenceEditor bind:isRecurring bind:recurrenceRule />
  {/if}
</form>
