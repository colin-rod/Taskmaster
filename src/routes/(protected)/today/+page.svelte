<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import CompletedTasksSection from '$lib/components/CompletedTasksSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import TaskListSection from '$lib/components/TaskListSection.svelte';
  import GettingStartedChecklist from '$lib/components/GettingStartedChecklist.svelte';
  import { groupByDay } from '$lib/utils/tasks.js';
  import SortFilterAccordion from '$lib/components/SortFilterAccordion.svelte';
  import { createSortFilterState } from '$lib/stores/sort-filter.svelte.js';
  import { filterTasks, sortTasks } from '$lib/utils/sort-filter.js';
  import { createOnboardingStore } from '$lib/stores/onboarding.js';
  import { browser } from '$app/environment';

  let { data }: { data: PageData } = $props();

  // Onboarding checklist state
  const onboardingStore = $derived(createOnboardingStore(data.profileId));
  let onboarding = $state({ dismissed: false, visitedCalendar: false });

  // Keep local state in sync with store
  $effect(() => {
    const unsub = onboardingStore.subscribe((val) => { onboarding = val; });
    return unsub;
  });

  // Gate: auto-dismiss for existing users who already have tasks
  $effect(() => {
    if (!onboarding.dismissed && browser) {
      const fc = data.filterCounts;
      const hasTasks = fc.inbox + fc.today + fc.upcoming + fc.completed > 0;
      if (hasTasks) {
        onboardingStore.update((s) => ({ ...s, dismissed: true }));
      }
    }
  });

  function dismissChecklist() {
    onboardingStore.update((s) => ({ ...s, dismissed: true }));
  }

  let selectedTask = $state<Task | null>(null);
  let selectedTaskRole = $state<ListRole>('owner');
  let sheetOpen = $state(false);

  function taskRole(task: Task): ListRole {
    if (!task.list_id) return 'owner';
    return (data.roleMap[task.list_id] as ListRole) ?? 'owner';
  }

  function openTask(task: Task) {
    selectedTask = task;
    selectedTaskRole = taskRole(task);
    sheetOpen = true;
  }

  let allActiveTasks = $derived([...data.overdue, ...data.dueToday, ...data.upcoming]);
  const sf = createSortFilterState(() => allActiveTasks);

  let activeOverdue = $derived(filterTasks(sortTasks(data.overdue, sf.sortKey), sf.filterPriority, sf.filterDue));
  let activeDueToday = $derived(filterTasks(sortTasks(data.dueToday, sf.sortKey), sf.filterPriority, sf.filterDue));
  let activeUpcoming = $derived(filterTasks(sortTasks(data.upcoming, sf.sortKey), sf.filterPriority, sf.filterDue));

  let completedTasks = $derived(data.completedToday);

  let upcomingGroups = $derived(groupByDay(activeUpcoming));
  let hasTodayTasks = $derived(activeOverdue.length > 0 || activeDueToday.length > 0);
</script>

<div>
  <h1 class="text-page-title font-accent page-title-accent mb-8">Today</h1>

  {#if !onboarding.dismissed}
    <GettingStartedChecklist
      filterCounts={data.filterCounts}
      lists={data.lists}
      visitedCalendar={onboarding.visitedCalendar}
      onDismiss={dismissChecklist}
    />
  {/if}

  {#if allActiveTasks.length > 0}
    <SortFilterAccordion filters={sf} />
  {/if}

  {#if !hasTodayTasks && upcomingGroups.length === 0 && completedTasks.length === 0}
    <EmptyState title="Clear skies ahead." subtitle="Nothing due today. A good time to plan ahead.">
      {#snippet illustration()}
        <div class="relative w-20 h-20 flex items-center justify-center" style="color: hsl(var(--primary))">
          <div
            class="absolute w-16 h-16 rounded-full sun-pulse-anim"
            style="background: hsl(var(--primary-tint));"
          ></div>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="relative z-10">
            <line x1="24" y1="3" x2="24" y2="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="24" y1="39" x2="24" y2="45" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="3" y1="24" x2="9" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="39" y1="24" x2="45" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="8.4" y1="8.4" x2="12.6" y2="12.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="35.4" y1="35.4" x2="39.6" y2="39.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="39.6" y1="8.4" x2="35.4" y2="12.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="12.6" y1="35.4" x2="8.4" y2="39.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="24" cy="24" r="9" fill="currentColor"/>
          </svg>
        </div>
      {/snippet}
    </EmptyState>
  {/if}

  {#if activeOverdue.length > 0}
    <TaskListSection label="Overdue" tasks={activeOverdue} {openTask} taskRoleFn={taskRole} variant="destructive" />
  {/if}

  {#if activeDueToday.length > 0}
    <TaskListSection label="Due Today" tasks={activeDueToday} {openTask} taskRoleFn={taskRole} />
  {/if}

  <!-- Upcoming section (combined Home view) -->
  {#if upcomingGroups.length > 0}
    <div class="mt-2">
      <div class="flex items-baseline gap-3 mb-4">
        <h2 class="text-section-header font-accent text-foreground-secondary" style="font-optical-sizing: auto;">Coming Up</h2>
        <div class="flex-1 h-px bg-border-divider"></div>
      </div>
      {#each upcomingGroups as group (group.isoDate)}
        <div class="mb-4">
          <h3 class="text-xs font-semibold tracking-wide uppercase text-foreground-muted/70 mb-2.5">{group.label}</h3>
          <div class="space-y-2">
            {#each group.tasks as task (task.id)}
              <TaskRow {task} onselect={openTask} userRole={taskRole(task)} />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <CompletedTasksSection tasks={completedTasks} {openTask} taskRoleFn={taskRole} />
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />

<style>
  @media (prefers-reduced-motion: no-preference) {
    .sun-pulse-anim {
      animation: sun-pulse 3s ease-in-out infinite;
    }
  }
</style>
