<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import { hasTime } from '$lib/utils/dates.js';

  let {
    task,
    role = 'due',
    showTime = false,
    onTaskClick,
  }: {
    task: Task;
    role?: 'due' | 'start';
    showTime?: boolean;
    onTaskClick: (task: Task) => void;
  } = $props();

  const priorityDotClass: Record<number, string> = {
    1: 'bg-destructive',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'hidden',
  };

  const timeLabel = $derived.by(() => {
    if (role === 'start' && task.start_at) {
      const d = new Date(task.start_at);
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    if (role === 'due' && task.due_at && hasTime(task.due_at)) {
      const d = new Date(task.due_at);
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return null;
  });
</script>

<button
  type="button"
  class="w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-xs leading-tight truncate transition-colors
    {role === 'due'
      ? 'bg-primary/10 hover:bg-primary/20 text-foreground border-l-2 border-primary'
      : 'bg-surface-subtle hover:bg-surface-overlay text-foreground-secondary border-l-2 border-foreground-muted'}"
  onclick={() => onTaskClick(task)}
>
  <span
    class="shrink-0 w-1.5 h-1.5 rounded-full {priorityDotClass[task.priority] ?? 'hidden'}"
  ></span>
  <span class="truncate">{task.title}</span>
  {#if timeLabel && showTime}
    <span class="shrink-0 text-foreground-muted ml-auto pl-1">{timeLabel}</span>
  {/if}
</button>
