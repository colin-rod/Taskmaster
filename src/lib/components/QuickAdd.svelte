<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { PRIORITY_OPTIONS } from '$lib/utils/design-tokens.js';
  import DatePickerPopover from '$lib/components/DatePickerPopover.svelte';

  let { action = '?/createTask' }: { action?: string } = $props();

  let title = $state('');
  let dueAt = $state<string | null>(null);
  let priority = $state(4);
  let creating = $state(false);
  let justAdded = $state(false);
  let addedTimeout: ReturnType<typeof setTimeout>;
  let priorityPopoverOpen = $state(false);

  let currentPriority = $derived(PRIORITY_OPTIONS.find((p) => p.level === priority)!);
</script>

<form
  method="POST"
  {action}
  class="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm"
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
        toast.success('Task added');
        justAdded = true;
        clearTimeout(addedTimeout);
        addedTimeout = setTimeout(() => { justAdded = false; }, 500);
      }
      await update();
    };
  }}
>
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

  <!-- Date popover -->
  <DatePickerPopover bind:value={dueAt} mode="controlled" disabled={creating} />

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
</form>
