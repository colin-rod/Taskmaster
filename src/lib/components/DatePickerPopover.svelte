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

  function formatDisplay(due_at: string | null): string {
    if (!due_at) return 'No date';
    const date = new Date(due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function isOverdue(due_at: string | null): boolean {
    if (!due_at) return false;
    return new Date(due_at) < new Date();
  }

  function toDateString(date: Date): string {
    return date.toISOString().split('T')[0] + 'T12:00:00.000Z';
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
    return toDateString(d);
  }

  function handleCustomDate(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      setDate(toDateString(new Date(input.value)));
    }
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
  <Popover.Content class="w-44 p-1" align="start">
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
    <div class="border-t border-border-divider mt-1 pt-1">
      <input
        type="date"
        class="w-full px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
        onchange={handleCustomDate}
      />
    </div>
  </Popover.Content>
</Popover.Root>
