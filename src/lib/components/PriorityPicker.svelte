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
    await patchTask(taskId, { priority: level }, 'Failed to update priority');
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <span
      class="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-subtle cursor-pointer hover:bg-border transition-colors {PRIORITY_OPTIONS.find(p => p.level === value)?.color ?? 'text-foreground-secondary'}"
    >
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
