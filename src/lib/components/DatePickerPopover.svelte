<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { hasTime, toDateString, formatDateOnly } from '$lib/utils/dates.js';
  import { patchTask } from '$lib/utils/api.js';

  let {
    taskId = undefined,
    value = $bindable<string | null>(null),
    disabled = false,
    mode = 'patch',
  }: {
    taskId?: string;
    value: string | null;
    disabled?: boolean;
    mode?: 'patch' | 'controlled';
  } = $props();

  let open = $state(false);

  function isOverdue(due_at: string | null): boolean {
    if (!due_at) return false;
    return new Date(due_at) < new Date();
  }

  // Get YYYY-MM-DD from current value (for <input type="date">)
  function getCurrentDateValue(): string {
    if (!value) return '';
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function setDate(due_at: string | null) {
    open = false;
    if (mode === 'controlled') {
      value = due_at;
    } else {
      await patchTask(taskId!, { due_at }, "Couldn't save date. Try again.");
    }
  }

  function quickDate(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    // Preserve existing time if one is set
    if (value && hasTime(value)) {
      const existing = new Date(value);
      d.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      return d.toISOString();
    }
    return toDateString(d);
  }

  function handleCustomDate(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      const newDate = new Date(input.value + 'T12:00:00');
      // Preserve existing time if set
      if (value && hasTime(value)) {
        const existing = new Date(value);
        newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
        setDate(newDate.toISOString());
      } else {
        setDate(toDateString(newDate));
      }
    }
  }

</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <button
      type="button"
      class="text-xs cursor-pointer hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm
        {isOverdue(value) ? 'text-destructive' : 'text-foreground-secondary'}"
      aria-label="Set due date: {formatDateOnly(value)}"
    >
      {formatDateOnly(value)}
    </button>
  </Popover.Trigger>
  <Popover.Content class="w-48 p-1" align="start">
    <button
      type="button"
      class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
      onclick={() => setDate(quickDate(0))}
    >
      Today
    </button>
    <button
      type="button"
      class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
      onclick={() => setDate(quickDate(1))}
    >
      Tomorrow
    </button>
    <button
      type="button"
      class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
      onclick={() => setDate(quickDate(7))}
    >
      Next week
    </button>
    {#if value}
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle text-destructive transition-colors"
        onclick={() => setDate(null)}
      >
        Remove date
      </button>
    {/if}
    <div class="border-t border-border-divider mt-1 pt-1 space-y-1">
      <input
        type="date"
        value={getCurrentDateValue()}
        class="w-full px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
        onchange={handleCustomDate}
      />
    </div>
  </Popover.Content>
</Popover.Root>
