<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import { formatTimeBlock } from '$lib/utils/dates.js';

  const ROW_HEIGHT_PX = 56;
  const START_HOUR = 7;

  let {
    task,
    onTaskClick,
  }: {
    task: Task;
    onTaskClick: (task: Task) => void;
  } = $props();

  const priorityDotClass: Record<number, string> = {
    1: 'bg-destructive',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'hidden',
  };

  const position = $derived.by(() => {
    if (!task.start_at) return null;
    const start = new Date(task.start_at);
    const hours = start.getHours() + start.getMinutes() / 60;
    const duration = task.duration_minutes ?? 30;
    const top = (hours - START_HOUR) * ROW_HEIGHT_PX;
    const height = Math.max((duration / 60) * ROW_HEIGHT_PX, 24);
    return { top, height };
  });

  const timeLabel = $derived(formatTimeBlock(task.start_at, task.duration_minutes));
</script>

{#if position}
  <button
    type="button"
    class="absolute inset-x-0.5 flex flex-col px-1.5 py-0.5 rounded text-xs overflow-hidden
           bg-primary/15 hover:bg-primary/25 border border-primary/30 text-foreground
           transition-colors text-left"
    style="top: {position.top}px; height: {position.height}px; min-height: 24px;"
    onclick={() => onTaskClick(task)}
  >
    <div class="flex items-center gap-1 min-w-0">
      <span
        class="shrink-0 w-1.5 h-1.5 rounded-full {priorityDotClass[task.priority] ?? 'hidden'}"
      ></span>
      <span class="truncate font-medium leading-tight">{task.title}</span>
    </div>
    {#if position.height >= 40 && timeLabel}
      <span class="text-foreground-muted truncate leading-tight mt-0.5">{timeLabel}</span>
    {/if}
  </button>
{/if}
