<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { getPriorityLabel } from '$lib/utils/design-tokens.js';
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

  const priorities = [
    { level: 1, label: 'P1', desc: 'Urgent', color: 'text-destructive' },
    { level: 2, label: 'P2', desc: 'High', color: 'text-orange-500' },
    { level: 3, label: 'P3', desc: 'Medium', color: 'text-blue-500' },
    { level: 4, label: 'P4', desc: 'Low', color: 'text-foreground-muted' },
  ];

  async function setPriority(level: number) {
    open = false;
    if (level === value) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: level }),
      });
      if (!res.ok) {
        toast.error('Failed to update priority');
      } else {
        await invalidateAll();
      }
    } catch {
      toast.error('Failed to update priority');
    }
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <span
      class="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-subtle text-foreground-secondary cursor-pointer hover:bg-border transition-colors"
    >
      {getPriorityLabel(value)}
    </span>
  </Popover.Trigger>
  <Popover.Content class="w-36 p-1" align="start">
    {#each priorities as p (p.level)}
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
