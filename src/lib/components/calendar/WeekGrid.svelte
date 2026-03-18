<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import type { CalendarDay } from '$lib/utils/calendar.js';
  import CalendarTaskChip from './CalendarTaskChip.svelte';
  import TimeBlock from './TimeBlock.svelte';

  let {
    days,
    showTime = false,
    onTaskClick,
  }: {
    days: CalendarDay[];
    showTime?: boolean;
    onTaskClick: (task: Task) => void;
  } = $props();

  const START_HOUR = 7;
  const END_HOUR = 22;
  const ROW_HEIGHT_PX = 56;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  function formatHour(h: number): string {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${display}${suffix}`;
  }

  function getDayHeader(day: CalendarDay): string {
    return day.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
</script>

<div class="overflow-auto rounded-lg border border-border">
  <!-- All-day row -->
  <div class="grid border-b border-border" style="grid-template-columns: 48px repeat({days.length}, 1fr);">
    <div class="bg-surface-subtle px-1 py-1 text-xs text-foreground-muted flex items-end justify-end pr-2 pb-1">all‑day</div>
    {#each days as day (day.isoDate)}
      <div
        class="bg-surface border-l border-border px-1 py-1 min-h-[32px] flex flex-col gap-0.5
          {day.isToday ? 'bg-primary/5' : ''}"
      >
        <!-- Day header -->
        <div
          class="text-xs font-medium text-center pb-0.5
            {day.isToday ? 'text-primary' : 'text-foreground-secondary'}"
        >
          {getDayHeader(day)}
        </div>
        <!-- All-day due tasks (no specific time) -->
        {#each day.dueTasks as task (task.id)}
          <CalendarTaskChip {task} role="due" {showTime} {onTaskClick} />
        {/each}
      </div>
    {/each}
  </div>

  <!-- Time grid -->
  <div class="relative" style="grid-template-columns: 48px repeat({days.length}, 1fr);">
    <!-- Background hour rows + timed due chips -->
    <div class="grid" style="grid-template-columns: 48px repeat({days.length}, 1fr);">
      {#each HOURS as hour}
        <!-- Time label -->
        <div
          class="bg-surface-subtle text-xs text-foreground-muted text-right pr-2 pt-0.5 border-t border-border"
          style="height: {ROW_HEIGHT_PX}px;"
        >
          {formatHour(hour)}
        </div>

        <!-- Day columns for this hour row -->
        {#each days as day (day.isoDate)}
          <div
            class="border-l border-t border-border bg-surface relative
              {day.isToday ? 'bg-primary/5' : ''}"
            style="height: {ROW_HEIGHT_PX}px;"
          >
            <!-- Timed due_at tasks that fall in this hour -->
            {#each day.timedDueTasks as task (task.id)}
              {@const taskHour = task.due_at ? new Date(task.due_at).getHours() : -1}
              {#if taskHour === hour}
                <div class="absolute inset-x-0.5 top-0.5">
                  <CalendarTaskChip {task} role="due" {showTime} {onTaskClick} />
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      {/each}
    </div>

    <!-- Absolute-positioned time blocks (start_at tasks) overlaid per day column -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="grid-template-columns: 48px repeat({days.length}, 1fr); display: grid; top: 0; left: 0; right: 0;"
    >
      <!-- Spacer for time label column -->
      <div></div>
      {#each days as day (day.isoDate)}
        <div class="relative pointer-events-auto" style="height: {HOURS.length * ROW_HEIGHT_PX}px;">
          {#each day.startTasks as task (task.id)}
            <TimeBlock {task} {onTaskClick} />
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
