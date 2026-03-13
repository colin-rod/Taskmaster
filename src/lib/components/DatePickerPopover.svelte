<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';

  let {
    taskId,
    value,
    disabled = false,
  }: {
    taskId: string;
    value: string | null;
    disabled?: boolean;
  } = $props();

  let open = $state(false);

  function hasTime(due_at: string): boolean {
    // T12:00:00.000Z is the date-only sentinel (noon UTC)
    return !due_at.endsWith('T12:00:00.000Z');
  }

  function formatDisplay(due_at: string | null): string {
    if (!due_at) return 'No date';
    const date = new Date(due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const showTime = hasTime(due_at);
    const timeStr = showTime
      ? ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    if (dateOnly.getTime() === today.getTime()) return 'Today' + timeStr;
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow' + timeStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + timeStr;
  }

  function isOverdue(due_at: string | null): boolean {
    if (!due_at) return false;
    return new Date(due_at) < new Date();
  }

  function toDateString(date: Date): string {
    return date.toISOString().split('T')[0] + 'T12:00:00.000Z';
  }

  // Get the current time portion from value (if a specific time is set), else null
  function getCurrentTimeSuffix(): string | null {
    if (!value || !hasTime(value)) return null;
    // Return "HH:MM" in local time for <input type="time">
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
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

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_at }),
      });
      if (!res.ok) {
        toast.error('Failed to update date');
      } else {
        await invalidateAll();
      }
    } catch {
      toast.error('Failed to update date');
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

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <span
      class="text-xs cursor-pointer hover:underline underline-offset-2 transition-colors
        {isOverdue(value) ? 'text-destructive' : 'text-foreground-secondary'}"
    >
      {formatDisplay(value)}
    </span>
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
      {#if value}
        <div class="flex items-center gap-1">
          <input
            type="time"
            value={getCurrentTimeSuffix() ?? ''}
            placeholder="Add time"
            class="flex-1 px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
            onchange={handleTimeChange}
          />
          {#if value && hasTime(value)}
            <button
              type="button"
              class="px-1.5 py-1 text-xs text-foreground-muted hover:text-foreground rounded hover:bg-surface-subtle transition-colors"
              onclick={clearTime}
              title="Clear time"
            >
              ✕
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
