<script lang="ts">
  import { Check, Circle, ChevronDown, ChevronUp } from '@lucide/svelte';
  import { slide } from 'svelte/transition';

  let {
    filterCounts,
    lists,
    visitedCalendar,
    onDismiss,
  }: {
    filterCounts: { today: number; inbox: number; upcoming: number; completed: number };
    lists: { id: string }[];
    visitedCalendar: boolean;
    onDismiss: () => void;
  } = $props();

  let expanded = $state(true);
  let allDoneShown = $state(false);

  const steps = $derived([
    {
      label: 'Add your first task',
      done: filterCounts.inbox > 0 || filterCounts.today > 0 || filterCounts.completed > 0,
    },
    {
      label: 'Create a list',
      done: lists.length > 0,
    },
    {
      label: 'Set a due date',
      done: filterCounts.today > 0 || filterCounts.upcoming > 0,
    },
    {
      label: 'Try the Calendar view',
      done: visitedCalendar,
    },
  ]);

  const completedCount = $derived(steps.filter((s) => s.done).length);
  const allDone = $derived(completedCount === steps.length);
  const progressPct = $derived((completedCount / steps.length) * 100);

  $effect(() => {
    if (allDone && !allDoneShown) {
      allDoneShown = true;
      setTimeout(() => onDismiss(), 4000);
    }
  });
</script>

{#if allDoneShown}
  <div
    class="rounded-xl border bg-surface mb-6 overflow-hidden"
    transition:slide={{ duration: 250 }}
  >
    <div class="px-5 py-4 flex items-center gap-3">
      <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
        <Check class="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <p class="text-body font-medium text-foreground">You're all set!</p>
    </div>
  </div>
{:else}
  <div
    class="rounded-xl border bg-surface mb-6 overflow-hidden"
    transition:slide={{ duration: 250 }}
  >
    <!-- Progress strip -->
    <div class="h-1 bg-border-divider">
      <div
        class="h-full bg-primary transition-all duration-300"
        style="width: {progressPct}%"
      ></div>
    </div>

    <!-- Header -->
    <button
      class="w-full px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-subtle/50 transition-colors"
      onclick={() => (expanded = !expanded)}
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-body font-semibold text-foreground">Getting started</h2>
        <span class="text-metadata text-foreground-muted">{completedCount} of {steps.length}</span>
      </div>
      {#if expanded}
        <ChevronUp class="w-4 h-4 text-foreground-muted" />
      {:else}
        <ChevronDown class="w-4 h-4 text-foreground-muted" />
      {/if}
    </button>

    <!-- Steps -->
    {#if expanded}
      <div class="px-5 pb-2" transition:slide={{ duration: 200 }}>
        <ul class="space-y-2.5">
          {#each steps as step}
            <li class="flex items-center gap-3">
              {#if step.done}
                <div class="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Check class="w-3 h-3 text-primary" />
                </div>
                <span class="text-body text-primary">{step.label}</span>
              {:else}
                <Circle class="w-5 h-5 text-foreground-muted/40 flex-shrink-0" />
                <span class="text-body text-foreground-muted">{step.label}</span>
              {/if}
            </li>
          {/each}
        </ul>

        <!-- Dismiss -->
        <div class="pt-3 pb-2 border-t border-border-divider mt-3">
          <button
            class="text-metadata text-foreground-muted hover:text-foreground-secondary transition-colors cursor-pointer"
            onclick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
