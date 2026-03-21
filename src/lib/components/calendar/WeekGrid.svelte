<script lang="ts">
  import type { Task } from '$lib/types/index.js';
  import type { CalendarDay } from '$lib/utils/calendar.js';
  import CalendarTaskChip from './CalendarTaskChip.svelte';
  import TimeBlock from './TimeBlock.svelte';
  import { START_HOUR, END_HOUR, ROW_HEIGHT_PX } from '$lib/constants/calendar.js';
  import { calendarSettings } from '$lib/stores/calendarSettings.js';

  let {
    days,
    showTime = false,
    onTaskClick,
  }: {
    days: CalendarDay[];
    showTime?: boolean;
    onTaskClick: (task: Task) => void;
  } = $props();

  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  let settings = $state({ workingHoursStart: 8, workingHoursEnd: 19 });
  calendarSettings.subscribe((v) => {
    settings = v;
  });

  const beforeHours = $derived(HOURS.filter((h) => h < settings.workingHoursStart));
  const workingHours = $derived(
    HOURS.filter((h) => h >= settings.workingHoursStart && h < settings.workingHoursEnd)
  );
  const afterHours = $derived(HOURS.filter((h) => h >= settings.workingHoursEnd));

  const showBeforeStub = $derived(beforeHours.length > 0);
  const showAfterStub = $derived(afterHours.length > 0);

  let beforeExpanded = $state(false);
  let afterExpanded = $state(false);

  const beforeTaskCount = $derived.by(() => {
    let count = 0;
    for (const day of days) {
      for (const task of day.timedDueTasks) {
        if (task.due_at && new Date(task.due_at).getHours() < settings.workingHoursStart) count++;
      }
      for (const task of day.startTasks) {
        if (task.start_at && new Date(task.start_at).getHours() < settings.workingHoursStart)
          count++;
      }
    }
    return count;
  });

  const afterTaskCount = $derived.by(() => {
    let count = 0;
    for (const day of days) {
      for (const task of day.timedDueTasks) {
        if (task.due_at && new Date(task.due_at).getHours() >= settings.workingHoursEnd) count++;
      }
      for (const task of day.startTasks) {
        if (task.start_at && new Date(task.start_at).getHours() >= settings.workingHoursEnd)
          count++;
      }
    }
    return count;
  });

  function formatHour(h: number): string {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${display}${suffix}`;
  }

  function getDayHeader(day: CalendarDay): string {
    return day.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }

  // Offset (in px) from the top of the full HOURS grid to the start of a section
  const beforeOffset = $derived(0);
  const workingOffset = $derived(beforeHours.length * ROW_HEIGHT_PX);
  const afterOffset = $derived((beforeHours.length + workingHours.length) * ROW_HEIGHT_PX);
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
        <div
          class="text-xs font-medium text-center pb-0.5
            {day.isToday ? 'text-primary' : 'text-foreground-secondary'}"
        >
          {getDayHeader(day)}
        </div>
        {#each day.dueTasks as task (task.id)}
          <CalendarTaskChip {task} role="due" {showTime} {onTaskClick} />
        {/each}
      </div>
    {/each}
  </div>

  <!-- Time grid -->
  <div>
    <!-- BEFORE stub -->
    {#if showBeforeStub}
      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 bg-surface-subtle border-b border-border cursor-pointer hover:bg-surface transition-colors text-left"
        style="height: 40px;"
        onclick={() => (beforeExpanded = !beforeExpanded)}
      >
        <span class="text-xs text-foreground-muted shrink-0" style="width: 40px;">
          {beforeExpanded ? '▲' : '▼'}
        </span>
        <span class="text-xs text-foreground-muted">
          Before {formatHour(settings.workingHoursStart)}
        </span>
        {#if beforeTaskCount > 0 && !beforeExpanded}
          <span class="text-xs bg-primary/15 text-primary rounded px-1.5 py-0.5">
            {beforeTaskCount}
            {beforeTaskCount !== 1 ? 'tasks' : 'task'}
          </span>
        {/if}
      </button>

      {#if beforeExpanded}
        {@render timeSection(beforeHours, beforeOffset)}
      {/if}
    {/if}

    <!-- WORKING HOURS (always visible) -->
    {@render timeSection(workingHours, workingOffset)}

    <!-- AFTER stub -->
    {#if showAfterStub}
      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 bg-surface-subtle border-t border-border cursor-pointer hover:bg-surface transition-colors text-left"
        style="height: 40px;"
        onclick={() => (afterExpanded = !afterExpanded)}
      >
        <span class="text-xs text-foreground-muted shrink-0" style="width: 40px;">
          {afterExpanded ? '▲' : '▼'}
        </span>
        <span class="text-xs text-foreground-muted">
          After {formatHour(settings.workingHoursEnd)}
        </span>
        {#if afterTaskCount > 0 && !afterExpanded}
          <span class="text-xs bg-primary/15 text-primary rounded px-1.5 py-0.5">
            {afterTaskCount}
            {afterTaskCount !== 1 ? 'tasks' : 'task'}
          </span>
        {/if}
      </button>

      {#if afterExpanded}
        {@render timeSection(afterHours, afterOffset)}
      {/if}
    {/if}
  </div>
</div>

{#snippet timeSection(hours: number[], sectionOffset: number)}
  <div
    class="relative"
    style="height: {hours.length * ROW_HEIGHT_PX}px;"
  >
    <!-- Background: y-axis labels + day column backgrounds -->
    <div class="grid h-full" style="grid-template-columns: 48px repeat({days.length}, 1fr);">
      <!-- Y-axis tick marks -->
      <div class="bg-surface-subtle relative">
        {#each hours as hour}
          <div
            class="relative flex items-start justify-end pr-2 pt-0.5"
            style="height: {ROW_HEIGHT_PX}px;"
          >
            {#if hour % 2 === 0}
              <span class="text-xs text-foreground-muted">{formatHour(hour)}</span>
            {/if}
            {#if hour % 2 === 0}
              <!-- Faint tick guideline across full width — rendered as absolute line -->
              <div
                class="absolute top-0 left-full border-t border-border/40 pointer-events-none"
                style="width: 100vw;"
              ></div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Day columns background + timedDueTasks -->
      {#each days as day (day.isoDate)}
        <div
          class="border-l border-border relative {day.isToday ? 'bg-primary/5' : 'bg-surface'}"
          style="height: {hours.length * ROW_HEIGHT_PX}px;"
        >
          {#each day.timedDueTasks as task (task.id)}
            {@const taskHour = task.due_at ? new Date(task.due_at).getHours() : -1}
            {#if hours.includes(taskHour)}
              {@const taskTop = (taskHour - START_HOUR) * ROW_HEIGHT_PX - sectionOffset}
              <div class="absolute inset-x-0.5" style="top: {taskTop + 2}px;">
                <CalendarTaskChip {task} role="due" {showTime} {onTaskClick} />
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>

    <!-- Absolute overlay for startTasks (TimeBlock) -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="display: grid; grid-template-columns: 48px repeat({days.length}, 1fr); top: 0; left: 0; right: 0;"
    >
      <div></div>
      {#each days as day (day.isoDate)}
        <div class="relative pointer-events-auto overflow-hidden" style="height: {hours.length * ROW_HEIGHT_PX}px;">
          <div
            class="relative"
            style="transform: translateY(-{sectionOffset}px); height: {HOURS.length * ROW_HEIGHT_PX}px;"
          >
            {#each day.startTasks as task (task.id)}
              <TimeBlock {task} {onTaskClick} />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/snippet}
