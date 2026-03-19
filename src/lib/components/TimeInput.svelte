<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import ScrollWheel from '$lib/components/ScrollWheel.svelte';

  let {
    value = $bindable(''),
    disabled = false,
    id,
    onchange,
  }: {
    value?: string;
    disabled?: boolean;
    id?: string;
    onchange?: () => void;
  } = $props();

  let open = $state(false);

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

  function parseValue(): { h: number; m: number } {
    if (!value) return { h: 9, m: 0 };
    const [hStr, mStr] = value.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    return {
      h: isNaN(h) ? 9 : h,
      m: MINUTES.includes(m) ? m : 0,
    };
  }

  let wheelHour = $state(parseValue().h);
  let wheelMinute = $state(parseValue().m);

  $effect(() => {
    if (open) {
      const parsed = parseValue();
      wheelHour = parsed.h;
      wheelMinute = parsed.m;
    }
  });

  $effect(() => {
    if (!open) return;
    const hh = String(wheelHour).padStart(2, '0');
    const mm = String(wheelMinute).padStart(2, '0');
    const next = `${hh}:${mm}`;
    if (next !== value) {
      value = next;
      onchange?.();
    }
  });

  function pickQuickTime(h: number, m: number) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    value = `${hh}:${mm}`;
    open = false;
    onchange?.();
  }

  function clearTime() {
    value = '';
    open = false;
    onchange?.();
  }

  function formatDisplay(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return hhmm;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    {#if value}
      <button
        type="button"
        {id}
        class="select-input mt-1 text-left text-sm"
        aria-label="Change time: {formatDisplay(value)}"
        {disabled}
      >
        {formatDisplay(value)}
      </button>
    {:else}
      <button
        type="button"
        {id}
        class="select-input mt-1 text-left text-sm text-foreground-muted"
        aria-label="Set time"
        {disabled}
      >
        + Time
      </button>
    {/if}
  </Popover.Trigger>

  <Popover.Content class="w-64 p-0 overflow-hidden" align="start">
    <!-- Side-by-side: quick times + scroll wheels -->
    <div class="flex">
      <!-- Quick select column -->
      <div class="flex flex-col p-2 gap-0.5">
        {#each QUICK_TIMES as qt (qt.label)}
          <button
            type="button"
            class="text-xs py-1 px-2 rounded hover:bg-surface-subtle transition-colors text-foreground-secondary hover:text-foreground font-mono text-left"
            onclick={() => pickQuickTime(qt.h, qt.m)}
          >
            {qt.label}
          </button>
        {/each}
      </div>

      <!-- Vertical divider -->
      <div class="w-px bg-border self-stretch"></div>

      <!-- Scroll wheels -->
      <div class="flex flex-1 items-center justify-center gap-1 px-3 py-2">
        <ScrollWheel items={HOUR_LABELS} values={HOURS} bind:value={wheelHour} />
        <span class="text-foreground-muted font-mono text-sm pb-0.5">:</span>
        <ScrollWheel items={MINUTE_LABELS} values={MINUTES} bind:value={wheelMinute} />
      </div>
    </div>

    <!-- Clear -->
    {#if value}
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
