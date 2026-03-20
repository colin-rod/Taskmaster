<script lang="ts">
  import type { Task, ListRole } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const motionDuration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

  let {
    label,
    tasks,
    openTask,
    taskRoleFn = () => 'owner' as ListRole,
    variant = 'default',
  }: {
    label: string;
    tasks: Task[];
    openTask: (task: Task) => void;
    taskRoleFn?: (task: Task) => ListRole;
    variant?: 'default' | 'destructive' | 'muted';
  } = $props();

  const headerClass = $derived(
    variant === 'destructive'
      ? 'text-destructive'
      : variant === 'muted'
        ? 'text-foreground-secondary'
        : 'text-foreground'
  );
</script>

<div class="mb-8">
  <div class="flex items-baseline gap-3 mb-4">
    <h2 class="text-section-header font-accent {headerClass}" style="font-optical-sizing: auto;">{label}</h2>
    <div class="flex-1 h-px bg-border-divider mt-0.5"></div>
    {#if tasks.length > 0}
      <span class="text-[11px] font-medium text-foreground-muted tabular-nums">{tasks.length}</span>
    {/if}
  </div>
  <div class="space-y-2">
    {#each tasks as task, i (task.id)}
      <div in:fly={{ y: -8, duration: motionDuration, delay: Math.min(i * 30, 150), easing: cubicOut }} out:fly={{ y: -4, duration: Math.min(motionDuration, 150), easing: cubicOut }}>
        <TaskRow {task} onselect={openTask} userRole={taskRoleFn(task)} />
      </div>
    {/each}
  </div>
</div>
