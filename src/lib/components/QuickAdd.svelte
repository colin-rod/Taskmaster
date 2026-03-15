<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';

  let { action = '?/createTask' }: { action?: string } = $props();

  let title = $state('');
  let dueAt = $state<string | null>(null);
  let priority = $state(4);
  let creating = $state(false);
  let datePopoverOpen = $state(false);
  let priorityPopoverOpen = $state(false);

  const priorities = [
    { level: 1, label: 'P1', desc: 'Urgent', color: 'text-destructive' },
    { level: 2, label: 'P2', desc: 'High', color: 'text-orange-500' },
    { level: 3, label: 'P3', desc: 'Medium', color: 'text-blue-500' },
    { level: 4, label: 'P4', desc: 'Low', color: 'text-foreground-muted' },
  ];

  let currentPriority = $derived(priorities.find((p) => p.level === priority)!);
  let dateLabel = $derived(dueAt ? formatDisplay(dueAt) : null);

  function toDateString(date: Date): string {
    return date.toISOString().split('T')[0] + 'T12:00:00.000Z';
  }

  function hasTime(due_at: string): boolean {
    return !due_at.endsWith('T12:00:00.000Z');
  }

  function formatDisplay(due_at: string): string {
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

  function getCurrentDateValue(): string {
    if (!dueAt) return '';
    const d = new Date(dueAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getCurrentTimeSuffix(): string | null {
    if (!dueAt || !hasTime(dueAt)) return null;
    const d = new Date(dueAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function quickDate(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    if (dueAt && hasTime(dueAt)) {
      const existing = new Date(dueAt);
      d.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      return d.toISOString();
    }
    return toDateString(d);
  }

  function handleCustomDate(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      const newDate = new Date(input.value + 'T12:00:00');
      if (dueAt && hasTime(dueAt)) {
        const existing = new Date(dueAt);
        newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
        dueAt = newDate.toISOString();
      } else {
        dueAt = toDateString(newDate);
      }
    }
  }

  function handleTimeChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.value || !dueAt) return;
    const [hh, mm] = input.value.split(':').map(Number);
    const d = new Date(dueAt);
    d.setHours(hh, mm, 0, 0);
    dueAt = d.toISOString();
  }

  function clearTime() {
    if (!dueAt) return;
    dueAt = toDateString(new Date(dueAt));
  }
</script>

<form
  method="POST"
  {action}
  class="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm"
  use:enhance={() => {
    creating = true;
    return async ({ result, update }) => {
      creating = false;
      if (result.type === 'success') {
        title = '';
        dueAt = null;
        priority = 4;
        datePopoverOpen = false;
        priorityPopoverOpen = false;
        toast.success('Task added');
      }
      await update();
    };
  }}
>
  <input
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
  <Popover.Root bind:open={datePopoverOpen}>
    <Popover.Trigger disabled={creating}>
      <span
        class="flex items-center gap-1 rounded px-2 py-2 text-sm transition-colors
          {dueAt
          ? 'text-foreground hover:bg-surface-subtle'
          : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}"
      >
        {#if dateLabel}
          <span>{dateLabel}</span>
          <button
            type="button"
            class="ml-0.5 text-foreground-muted hover:text-foreground leading-none"
            onclick={(e) => { e.stopPropagation(); dueAt = null; }}
            aria-label="Clear date"
          >✕</button>
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="12" height="11" rx="1.5" />
            <path d="M2 6h12M5 1v3M11 1v3" />
          </svg>
        {/if}
      </span>
    </Popover.Trigger>
    <Popover.Content class="w-48 p-1" align="start">
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
        onclick={() => { dueAt = quickDate(0); datePopoverOpen = false; }}
      >
        Today
      </button>
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
        onclick={() => { dueAt = quickDate(1); datePopoverOpen = false; }}
      >
        Tomorrow
      </button>
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors"
        onclick={() => { dueAt = quickDate(7); datePopoverOpen = false; }}
      >
        Next week
      </button>
      {#if dueAt}
        <button
          type="button"
          class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle text-destructive transition-colors"
          onclick={() => { dueAt = null; datePopoverOpen = false; }}
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
        {#if dueAt}
          <div class="flex items-center gap-1">
            <input
              type="time"
              value={getCurrentTimeSuffix() ?? ''}
              placeholder="Add time"
              class="flex-1 px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none"
              onchange={handleTimeChange}
            />
            {#if dueAt && hasTime(dueAt)}
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
      {#each priorities as p (p.level)}
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
    Add
  </button>
</form>
