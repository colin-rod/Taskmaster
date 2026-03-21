<script lang="ts">
  import type { PageData } from './$types';
  import type { Task, ListRole, SearchResult } from '$lib/types/index.js';
  import { Search, X } from '@lucide/svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';

  let { data }: { data: PageData } = $props();

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let inputEl: HTMLInputElement;

  let selectedTask = $state<Task | null>(null);
  let selectedTaskRole = $state<ListRole>('owner');
  let sheetOpen = $state(false);

  $effect(() => {
    inputEl?.focus();
  });

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      results = [];
      loading = false;
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      results = json.tasks ?? [];
      loading = false;
    }, 300);
  }

  async function selectTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`);
    const json = await res.json();
    if (json.task) {
      selectedTask = json.task;
      selectedTaskRole = selectedTask?.list_id
        ? ((data.roleMap[selectedTask.list_id] as ListRole) ?? 'owner')
        : 'owner';
      sheetOpen = true;
    }
  }
</script>

<div class="max-w-lg mx-auto">
  <!-- Search input -->
  <div class="sticky top-0 bg-background pt-1 pb-3 z-10">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={handleInput}
        type="text"
        placeholder="Search tasks..."
        class="w-full pl-9 pr-9 py-2.5 text-sm bg-surface-subtle border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-foreground-muted"
      />
      {#if query}
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
          onclick={() => { query = ''; results = []; }}
          aria-label="Clear search"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if loading}
    <div class="px-3 py-4 text-sm text-foreground-muted">Searching...</div>
  {:else if results.length > 0}
    <div class="space-y-0.5">
      {#each results as result (result.id)}
        <button
          type="button"
          class="flex items-center gap-3 w-full px-3 py-3 text-left rounded-lg hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
          onclick={() => selectTask(result.id)}
        >
          {#if result.list}
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background-color: {result.list.color || 'hsl(var(--foreground-muted))'}"
            ></div>
          {:else}
            <div class="w-2.5 h-2.5 flex-shrink-0"></div>
          {/if}
          <span class="flex-1 text-sm truncate">{result.title}</span>
          {#if result.list}
            <span class="text-xs text-foreground-muted truncate max-w-[100px]">{result.list.name}</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else if query.trim()}
    <div class="px-3 py-8 text-center text-sm text-foreground-muted">No tasks found</div>
  {/if}
</div>

<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} userRole={selectedTaskRole} />
