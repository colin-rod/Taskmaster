<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import { goto } from '$app/navigation';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import MonthGrid from '$lib/components/calendar/MonthGrid.svelte';
  import WeekGrid from '$lib/components/calendar/WeekGrid.svelte';
  import {
    buildMonthGrid,
    buildWeekGrid,
    buildDayGrid,
    distributeTasks,
    formatMonthLabel,
    formatWeekLabel,
    formatDayLabel,
  } from '$lib/utils/calendar.js';

  let { data }: { data: PageData } = $props();

  let selectedTask = $state<Task | null>(null);
  let selectedTaskRole = $state<ListRole>('owner');
  let sheetOpen = $state(false);

  const anchor = $derived(new Date(data.anchorIso));
  const view = $derived(data.view as 'month' | 'week' | 'day');

  const calendarDays = $derived.by(() => {
    const days =
      view === 'week'
        ? buildWeekGrid(anchor)
        : view === 'day'
          ? buildDayGrid(anchor)
          : buildMonthGrid(anchor.getFullYear(), anchor.getMonth());
    return distributeTasks(days, data.tasks);
  });

  const periodLabel = $derived(
    view === 'week'
      ? formatWeekLabel(calendarDays)
      : view === 'day'
        ? formatDayLabel(anchor)
        : formatMonthLabel(anchor)
  );

  function taskRole(task: Task): ListRole {
    if (!task.list_id) return 'owner';
    return (data.roleMap?.[task.list_id] as ListRole) ?? 'owner';
  }

  function openTask(task: Task) {
    selectedTask = task;
    selectedTaskRole = taskRole(task);
    sheetOpen = true;
  }

  function drillToWeek(isoDate: string) {
    goto(`/calendar?view=week&date=${isoDate}`);
  }

  function navigate(direction: -1 | 1) {
    const d = new Date(anchor);
    if (view === 'week') {
      d.setDate(d.getDate() + direction * 7);
    } else if (view === 'day') {
      d.setDate(d.getDate() + direction);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    const dateStr =
      view === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().slice(0, 10);
    goto(`/calendar?view=${view}&date=${dateStr}`);
  }

  function switchView(newView: 'month' | 'week' | 'day') {
    if (newView === view) return;
    const dateStr =
      newView === 'month'
        ? `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`
        : anchor.toISOString().slice(0, 10);
    goto(`/calendar?view=${newView}&date=${dateStr}`);
  }

  function backToMonth() {
    const y = anchor.getFullYear();
    const m = String(anchor.getMonth() + 1).padStart(2, '0');
    goto(`/calendar?view=month&date=${y}-${m}`);
  }

</script>

<div class="flex flex-col h-full gap-4">
  <!-- Header -->
  <div class="flex items-center gap-3 flex-wrap">
    <div class="flex items-center gap-2">
      <a
        href="/inbox"
        class="text-xs text-foreground-secondary hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <ChevronLeft class="w-3.5 h-3.5" />
        Inbox
      </a>
      {#if view === 'week' || view === 'day'}
        <span class="text-foreground-muted text-xs">/</span>
        <button
          type="button"
          class="text-xs text-foreground-secondary hover:text-foreground transition-colors"
          onclick={backToMonth}
        >
          Month
        </button>
      {/if}
    </div>

    <!-- Nav controls -->
    <div class="flex items-center gap-1 ml-auto">
      <button
        type="button"
        class="p-1.5 rounded-md hover:bg-surface-subtle transition-colors text-foreground-secondary hover:text-foreground"
        onclick={() => navigate(-1)}
        aria-label="Previous {view}"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <span class="text-sm font-medium min-w-[150px] text-center">{periodLabel}</span>
      <button
        type="button"
        class="p-1.5 rounded-md hover:bg-surface-subtle transition-colors text-foreground-secondary hover:text-foreground"
        onclick={() => navigate(1)}
        aria-label="Next {view}"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- View toggle -->
    <div class="flex rounded-md border border-border overflow-hidden text-xs">
      <button
        type="button"
        class="px-3 py-1.5 transition-colors
          {view === 'month'
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface text-foreground-secondary hover:bg-surface-subtle'}"
        onclick={() => switchView('month')}
      >
        Month
      </button>
      <button
        type="button"
        class="px-3 py-1.5 transition-colors border-l border-border
          {view === 'week'
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface text-foreground-secondary hover:bg-surface-subtle'}"
        onclick={() => switchView('week')}
      >
        Week
      </button>
      <button
        type="button"
        class="px-3 py-1.5 transition-colors border-l border-border
          {view === 'day'
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface text-foreground-secondary hover:bg-surface-subtle'}"
        onclick={() => switchView('day')}
      >
        Day
      </button>
    </div>
  </div>

  <!-- Calendar grid -->
  <div class="flex-1 min-h-0 overflow-auto">
    {#if view === 'month'}
      <MonthGrid days={calendarDays} onTaskClick={openTask} onDayClick={drillToWeek} />
    {:else if view === 'day'}
      <WeekGrid days={calendarDays} onTaskClick={openTask} showTime={true} />
    {:else}
      <WeekGrid days={calendarDays} onTaskClick={openTask} />
    {/if}
  </div>
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
