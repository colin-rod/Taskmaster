<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import ScrollWheel from '$lib/components/ScrollWheel.svelte';
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

  // Scroll wheel state — 24h
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_LABELS = HOURS.map((h) => String(h).padStart(2, '0'));
  const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
  const MINUTE_LABELS = MINUTES.map((m) => String(m).padStart(2, '0'));

  const QUICK_TIMES = [
    { label: '06:00', h: 6,  m: 0 },
    { label: '09:00', h: 9,  m: 0 },
    { label: '12:00', h: 12, m: 0 },
    { label: '15:00', h: 15, m: 0 },
    { label: '18:00', h: 18, m: 0 },
    { label: '21:00', h: 21, m: 0 },
  ];

  function getInitialHour(): number {
    if (value && hasTime(value)) return new Date(value).getHours();
    return 9;
  }

  function getInitialMinute(): number {
    if (value && hasTime(value)) {
      const raw = new Date(value).getMinutes();
      return MINUTES.includes(raw) ? raw : 0;
    }
    return 0;
  }

  let wheelHour = $state(getInitialHour());
  let wheelMinute = $state(getInitialMinute());

  // Re-sync wheel state when popover opens or value changes externally
  $effect(() => {
    if (open) {
      wheelHour = getInitialHour();
      wheelMinute = getInitialMinute();
    }
  });

  // Live-update as wheels change
  $effect(() => {
    if (!open || !value) return;
    const d = new Date(value);
    const current = d.getHours() * 60 + d.getMinutes();
    const next = wheelHour * 60 + wheelMinute;
    if (current !== next) {
      d.setHours(wheelHour, wheelMinute, 0, 0);
      applyTime(d.toISOString());
    }
  });

  async function applyTime(iso: string) {
    if (mode === 'controlled') {
      value = iso;
    } else {
      await patchTask(taskId!, { due_at: iso }, "Couldn't save time. Try again.");
    }
  }

  async function pickQuickTime(h: number, m: number) {
    if (!value) return;
    const d = new Date(value);
    d.setHours(h, m, 0, 0);
    open = false;
    await applyTime(d.toISOString());
  }

  async function clearTime() {
    if (!value) return;
    const iso = toDateString(new Date(value));
    open = false;
    if (mode === 'controlled') {
      value = iso;
    } else {
      await patchTask(taskId!, { due_at: iso }, "Couldn't save time. Try again.");
    }
  }
</script>

{#if value}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled}>
      {#if hasTime(value)}
        <button
          type="button"
          class="text-xs cursor-pointer hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm text-foreground-secondary"
          aria-label="Set time: {formatTimeOnly(value)}"
        >
          {formatTimeOnly(value)}
        </button>
      {:else}
        <button
          type="button"
          class="text-xs cursor-pointer text-foreground-muted hover:text-foreground-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
          aria-label="Add time"
        >
          + Time
        </button>
      {/if}
    </Popover.Trigger>

    <Popover.Content class="w-52 p-0 overflow-hidden" align="start">
      <!-- Quick select -->
      <div class="grid grid-cols-3 gap-1 p-2 border-b border-border">
        {#each QUICK_TIMES as qt (qt.label)}
          <button
            type="button"
            class="text-xs py-1 px-1.5 rounded hover:bg-surface-subtle transition-colors text-foreground-secondary hover:text-foreground font-mono"
            onclick={() => pickQuickTime(qt.h, qt.m)}
          >
            {qt.label}
          </button>
        {/each}
      </div>

      <!-- Scroll wheels -->
      <div class="flex items-center justify-center gap-1 px-3 py-2">
        <ScrollWheel items={HOUR_LABELS} values={HOURS} bind:value={wheelHour} />
        <span class="text-foreground-muted font-mono text-sm pb-0.5">:</span>
        <ScrollWheel items={MINUTE_LABELS} values={MINUTES} bind:value={wheelMinute} />
      </div>

      <!-- Remove time -->
      {#if hasTime(value)}
        <div class="border-t border-border p-1">
          <button
            type="button"
            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle text-destructive transition-colors"
            onclick={clearTime}
          >
            Remove time
          </button>
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
{/if}
