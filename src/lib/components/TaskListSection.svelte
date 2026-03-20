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
        : ''
  );
</script>

<div class="mb-6">
  <h2 class="text-section-header font-accent mb-3 {headerClass}">{label}</h2>
  <div class="space-y-2">
    {#each tasks as task (task.id)}
      <div in:fly={{ y: -8, duration: motionDuration, easing: cubicOut }}>
        <TaskRow {task} onselect={openTask} userRole={taskRoleFn(task)} />
      </div>
    {/each}
  </div>
</div>
