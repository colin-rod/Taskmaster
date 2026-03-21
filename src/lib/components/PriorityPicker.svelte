<script lang="ts">
  import { getPriorityLabel, PRIORITY_OPTIONS } from '$lib/utils/design-tokens.js';
  import { patchTask } from '$lib/utils/api.js';
  import * as Popover from '$lib/components/ui/popover/index.js';

  let {
    taskId,
    value,
    disabled = false,
  }: {
    taskId: string;
    value: number;
    disabled?: boolean;
  } = $props();

  let open = $state(false);

  async function setPriority(level: number) {
    open = false;
    if (level === value) return;
    await patchTask(taskId, { priority: level }, 'Couldn\'t update the priority — try again.');
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    {@const p = PRIORITY_OPTIONS.find(p => p.level === value)}
    <span
      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-subtle cursor-pointer hover:bg-border transition-colors {p?.color ?? 'text-foreground-secondary'}"
    >
      <span class="inline-block w-1.5 h-1.5 rounded-full {p?.dot ?? 'bg-foreground-disabled'}"></span>
      {getPriorityLabel(value)}
    </span>
  </Popover.Trigger>
  <Popover.Content class="w-36 p-1" align="start">
    {#each PRIORITY_OPTIONS as p (p.level)}
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
          {p.level === value ? 'bg-surface-subtle font-medium' : ''}"
        onclick={() => setPriority(p.level)}
      >
        <span class="font-medium {p.color}">{p.label}</span>
        <span class="text-foreground-secondary">{p.desc}</span>
      </button>
    {/each}
  </Popover.Content>
</Popover.Root>
