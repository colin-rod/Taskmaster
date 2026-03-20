<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';

  let {
    value = $bindable<number | null>(null),
    disabled = false,
    onchange,
    open = $bindable(false),
  }: {
    value?: number | null;
    disabled?: boolean;
    onchange?: () => void;
    open?: boolean;
  } = $props();

  const PRESETS = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hr', minutes: 60 },
    { label: '1.5 hr', minutes: 90 },
    { label: '2 hr', minutes: 120 },
  ];

  let customValue = $state('');

  $effect(() => {
    if (open) {
      customValue = value && !PRESETS.some((p) => p.minutes === value) ? String(value) : '';
    }
  });

  function pickPreset(minutes: number) {
    value = minutes;
    open = false;
    onchange?.();
  }

  function applyCustom() {
    const parsed = parseInt(customValue, 10);
    if (parsed > 0) {
      value = parsed;
      open = false;
      onchange?.();
    }
  }

  function clearDuration() {
    value = null;
    open = false;
    onchange?.();
  }

  function formatDuration(minutes: number | null): string {
    if (minutes == null) return '+ Duration';
    if (minutes < 60) return `${minutes} min`;
    const hrs = minutes / 60;
    if (Number.isInteger(hrs)) return `${hrs} hr`;
    return `${hrs} hr`;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <button
      type="button"
      class="text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm whitespace-nowrap
        {value != null ? 'text-foreground' : 'text-foreground-muted'}"
      aria-label={value != null ? `Duration: ${formatDuration(value)}` : 'Set duration'}
      {disabled}
    >
      {formatDuration(value)}
    </button>
  </Popover.Trigger>

  <Popover.Content class="w-48 p-1" align="start">
    {#each PRESETS as preset (preset.minutes)}
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded transition-colors
          {value === preset.minutes
            ? 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-surface-subtle text-foreground-secondary'}"
        onclick={() => pickPreset(preset.minutes)}
      >
        {preset.label}
      </button>
    {/each}
    <div class="border-t border-border-divider mt-1 pt-1">
      <form
        class="flex items-center gap-1 px-1"
        onsubmit={(e) => { e.preventDefault(); applyCustom(); }}
      >
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Custom min"
          bind:value={customValue}
          class="w-full px-2 py-1.5 text-sm rounded bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </form>
    </div>
    {#if value != null}
      <div class="border-t border-border-divider mt-1 pt-1">
        <button
          type="button"
          class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle text-destructive transition-colors"
          onclick={clearDuration}
        >
          Remove duration
        </button>
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>
