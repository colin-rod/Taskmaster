<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { hasTime, toDateString, formatTimeOnly } from '$lib/utils/dates.js';
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

  function getCurrentTimeSuffix(): string | null {
    if (!value || !hasTime(value)) return null;
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  async function setDate(due_at: string | null) {
    open = false;
    if (mode === 'controlled') {
      value = due_at;
    } else {
      await patchTask(taskId!, { due_at }, "Couldn't save time. Try again.");
    }
  }

  function handleTimeChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.value || !value) return;
    const [hh, mm] = input.value.split(':').map(Number);
    const d = new Date(value);
    d.setHours(hh, mm, 0, 0);
    setDate(d.toISOString());
  }

  function clearTime() {
    if (!value) return;
    const d = new Date(value);
    setDate(toDateString(d));
  }
</script>

{#if value && hasTime(value)}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled}>
      <button
        type="button"
        class="text-xs cursor-pointer hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm text-foreground-secondary"
        aria-label="Set time: {formatTimeOnly(value)}"
      >
        {formatTimeOnly(value)}
      </button>
    </Popover.Trigger>
    <Popover.Content class="w-44 p-1" align="start">
      <div class="px-1 py-0.5">
        <input
          type="time"
          value={getCurrentTimeSuffix() ?? ''}
          class="w-full px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
          onchange={handleTimeChange}
        />
      </div>
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle text-destructive transition-colors"
        onclick={clearTime}
      >
        Remove time
      </button>
    </Popover.Content>
  </Popover.Root>
{:else if value}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled}>
      <button
        type="button"
        class="text-xs cursor-pointer text-foreground-muted hover:text-foreground-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
        aria-label="Add time"
      >
        + Time
      </button>
    </Popover.Trigger>
    <Popover.Content class="w-44 p-1" align="start">
      <div class="px-1 py-0.5">
        <input
          type="time"
          class="w-full px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
          onchange={handleTimeChange}
        />
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
