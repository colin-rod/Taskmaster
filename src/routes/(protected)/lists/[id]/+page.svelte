<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { Task, ListRole, TaskListMember } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import MemberManager from '$lib/components/MemberManager.svelte';
  import { Users } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);
  let membersOpen = $state(false);

  // Derive current user's role on this list
  let userRole = $derived<ListRole>(
    data.list.members?.find((m: TaskListMember) => m.user_id === data.profileId)?.role ?? 'owner'
  );
  let isOwner = $derived(userRole === 'owner');

  function openTask(task: Task) {
    selectedTask = task;
    sheetOpen = true;
  }

  let activeTasks = $derived(data.tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled'));
  let completedTasks = $derived(data.tasks.filter((t) => t.status === 'done' || t.status === 'canceled'));
  let showCompleted = $state(false);
</script>

<div>
  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <a href="/lists" class="text-foreground-secondary hover:text-foreground">
      <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </a>
    <div class="flex items-center gap-2">
      {#if data.list.color}
        <div class="w-3 h-3 rounded-full shrink-0" style="background-color: {data.list.color}"></div>
      {/if}
      <h1 class="text-page-title font-accent">{data.list.name}</h1>
    </div>
    {#if isOwner}
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
        onclick={() => { membersOpen = true; }}
      >
        <Users class="w-4 h-4" />
        <span>{(data.list.members ?? []).length}</span>
      </button>
    {/if}
  </div>

  {#if form?.error}
    <div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {form.error}
    </div>
  {/if}

  <!-- Quick add -->
  {#if userRole !== 'viewer'}
    <div class="mb-4">
      <QuickAdd />
    </div>
  {/if}

  <!-- Active tasks -->
  {#if activeTasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks yet. Add one above.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each activeTasks as task (task.id)}
        <TaskRow {task} onselect={openTask} {userRole} />
      {/each}
    </div>
  {/if}

  <!-- Completed tasks -->
  {#if completedTasks.length > 0}
    <div class="mt-6">
      <button
        type="button"
        class="text-sm text-foreground-secondary hover:text-foreground"
        onclick={() => { showCompleted = !showCompleted; }}
      >
        {showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
      </button>
      {#if showCompleted}
        <div class="space-y-2 mt-2">
          {#each completedTasks as task (task.id)}
            <TaskRow {task} onselect={openTask} {userRole} />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} {userRole} members={data.list.members ?? []} />
{#if isOwner}
  <MemberManager list={data.list} bind:open={membersOpen} />
{/if}
