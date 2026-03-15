<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { Task, ListRole, TaskListMember } from '$lib/types/index.js';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import MemberManager from '$lib/components/MemberManager.svelte';
  import { Users } from '@lucide/svelte';
  import { getListIcon, LIST_ICONS } from '$lib/utils/icons.js';
  import { LIST_COLORS } from '$lib/types/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';

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
  const ListIcon = $derived(getListIcon(data.list.icon));

  // svelte-ignore state_referenced_locally
  let localIcon = $state(data.list.icon);
  // svelte-ignore state_referenced_locally
  let localColor = $state<string | null>(data.list.color);
  const LocalListIcon = $derived(getListIcon(localIcon));

  $effect(() => {
    localIcon = data.list.icon;
    localColor = data.list.color;
  });
</script>

<div>
  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <a href="/lists" aria-label="Back to lists" class="text-foreground-secondary hover:text-foreground">
      <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </a>
    <div class="flex items-center gap-2">
      {#if isOwner}
        <Popover.Root>
          <Popover.Trigger>
            <button
              type="button"
              title="Change icon and color"
              class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-foreground-muted transition-all"
              style="background-color: {localColor || 'hsl(var(--foreground-muted))'}"
            >
              <LocalListIcon class="w-3.5 h-3.5 text-white" />
            </button>
          </Popover.Trigger>
          <Popover.Content class="w-72 p-3" align="start">
            <form
              id="appearance-form"
              method="POST"
              action="?/updateListAppearance"
              use:enhance={() => {
                return async ({ result, update }) => {
                  if (result.type === 'failure') {
                    localIcon = data.list.icon;
                    localColor = data.list.color;
                    toast.error((result.data as Record<string, string>)?.error ?? 'Failed to update');
                  }
                  await update({ reset: false });
                };
              }}
            >
              <input type="hidden" name="icon" bind:value={localIcon} />
              <input type="hidden" name="color" value={localColor ?? ''} />
            </form>

            <p class="text-xs font-medium text-foreground-secondary mb-2">Icon</p>
            <div class="grid grid-cols-10 gap-1 mb-3">
              {#each LIST_ICONS as item}
                {@const IconComp = getListIcon(item.name)}
                <button
                  type="button"
                  title={item.label}
                  class="w-7 h-7 rounded-md flex items-center justify-center transition-colors
                    {localIcon === item.name
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground-secondary hover:bg-surface-subtle hover:text-foreground'}"
                  onclick={() => { localIcon = item.name; (document.getElementById('appearance-form') as HTMLFormElement | null)?.requestSubmit(); }}
                >
                  <IconComp class="w-4 h-4" />
                </button>
              {/each}
            </div>

            <p class="text-xs font-medium text-foreground-secondary mb-2">Color</p>
            <div class="flex gap-2">
              {#each LIST_COLORS as c}
                <button
                  type="button"
                  aria-label={c}
                  class="w-7 h-7 rounded-full border-2 transition-transform {localColor === c ? 'border-foreground scale-110' : 'border-transparent'}"
                  style="background-color: {c}"
                  onclick={() => { localColor = localColor === c ? null : c; (document.getElementById('appearance-form') as HTMLFormElement | null)?.requestSubmit(); }}
                ></button>
              {/each}
            </div>
          </Popover.Content>
        </Popover.Root>
      {:else}
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style="background-color: {data.list.color || 'hsl(var(--foreground-muted))'}"
        >
          <ListIcon class="w-3.5 h-3.5 text-white" />
        </div>
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

  <!-- Active tasks -->
  {#if activeTasks.length === 0}
    <div class="text-center py-8">
      <p class="text-foreground-secondary">No tasks yet. Add one above.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each activeTasks as task (task.id)}
        <TaskRow {task} onselect={openTask} {userRole} members={data.list.members ?? []} />
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
            <TaskRow {task} onselect={openTask} {userRole} members={data.list.members ?? []} />
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
