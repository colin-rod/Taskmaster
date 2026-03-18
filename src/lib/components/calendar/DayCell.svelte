<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import type { CalendarDay } from '$lib/utils/calendar.js';
  import CalendarTaskChip from './CalendarTaskChip.svelte';

  let {
    day,
    onTaskClick,
    onDayClick,
  }: {
    day: CalendarDay;
    onTaskClick: (task: Task) => void;
    onDayClick: (isoDate: string) => void;
  } = $props();

  const MAX_VISIBLE = 3;

  // Combine all tasks for the cell: all-day due first, then timed due, then start_at chips
  const allTasks = $derived([...day.dueTasks, ...day.timedDueTasks, ...day.startTasks]);
  const visibleTasks = $derived(allTasks.slice(0, MAX_VISIBLE));
  const overflow = $derived(allTasks.length - MAX_VISIBLE);

  function getRoleForTask(task: Task): 'due' | 'start' {
    return task.start_at && !task.due_at ? 'start' : 'due';
  }
</script>

<div
  class="bg-surface min-h-[90px] flex flex-col gap-0.5 p-1
    {!day.isCurrentMonth ? 'opacity-40' : ''}"
>
  <!-- Day number -->
  <button
    type="button"
    class="self-start text-xs font-medium leading-none rounded-full w-5 h-5 flex items-center justify-center mb-0.5
      {day.isToday
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground hover:bg-surface-subtle'}"
    onclick={() => onDayClick(day.isoDate)}
    aria-label="View week of {day.isoDate}"
  >
    {day.date.getDate()}
  </button>

  <!-- Task chips -->
  <div class="flex flex-col gap-0.5">
    {#each visibleTasks as task (task.id)}
      <CalendarTaskChip {task} role={getRoleForTask(task)} {onTaskClick} />
    {/each}
  </div>

  <!-- Overflow -->
  {#if overflow > 0}
    <button
      type="button"
      class="text-left text-xs text-foreground-secondary hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-subtle transition-colors"
      onclick={() => onDayClick(day.isoDate)}
    >
      +{overflow} more
    </button>
  {/if}
</div>
