<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import type { CalendarDay } from '$lib/utils/calendar.js';
  import DayCell from './DayCell.svelte';

  let {
    days,
    onTaskClick,
    onDayClick,
  }: {
    days: CalendarDay[];
    onTaskClick: (task: Task) => void;
    onDayClick: (isoDate: string) => void;
  } = $props();

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

<div class="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
  <!-- Weekday headers -->
  {#each WEEKDAYS as day}
    <div class="bg-surface px-2 py-1.5 text-xs font-medium text-foreground-secondary text-center">
      {day}
    </div>
  {/each}

  <!-- Day cells -->
  {#each days as day (day.isoDate)}
    <DayCell {day} {onTaskClick} {onDayClick} />
  {/each}
</div>
