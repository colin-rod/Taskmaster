<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import type { CalendarDay } from '$lib/utils/calendar.js';
  import CalendarTaskChip from './CalendarTaskChip.svelte';

  let {
    days,
    onTaskClick,
  }: {
    days: CalendarDay[];
    onTaskClick: (task: Task) => void;
  } = $props();

  function getDayHeader(day: CalendarDay): string {
    return day.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
</script>

<div class="overflow-auto rounded-lg border border-border">
  <div class="grid border-b border-border" style="grid-template-columns: repeat({days.length}, 1fr);">
    {#each days as day (day.isoDate)}
      <div
        class="bg-surface border-l border-border first:border-l-0 px-1 py-1 min-h-20 flex flex-col gap-0.5
          {day.isToday ? 'bg-primary/5' : ''}"
      >
        <div
          class="text-xs font-medium text-center pb-0.5
            {day.isToday ? 'text-primary' : 'text-foreground-secondary'}"
        >
          {getDayHeader(day)}
        </div>
        {#each day.dueTasks as task (task.id)}
          <CalendarTaskChip {task} {onTaskClick} />
        {/each}
      </div>
    {/each}
  </div>
</div>
