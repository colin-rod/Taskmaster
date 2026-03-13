<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import type { SearchResult } from '$lib/types/index.js';

  let {
    onSelectTask,
    onClose,
  }: {
    onSelectTask: (taskId: string) => void;
    onClose: () => void;
  } = $props();

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let inputEl: HTMLInputElement;

  $effect(() => {
    inputEl?.focus();
  });

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      results = [];
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      results = data.tasks ?? [];
      loading = false;
    }, 300);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function selectTask(id: string) {
    onSelectTask(id);
    onClose();
  }
</script>

<div class="px-2 pb-2">
  <div class="relative">
    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      type="text"
      placeholder="Search tasks…"
      class="w-full pl-7 pr-7 py-1.5 text-sm bg-surface-subtle border border-border rounded-md outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-foreground-muted"
    />
    {#if query}
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
        onclick={() => { query = ''; results = []; }}
        aria-label="Clear search"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  {#if query.trim() && (results.length > 0 || loading)}
    <div class="mt-1 rounded-md border border-border bg-surface shadow-sm overflow-hidden">
      {#if loading}
        <div class="px-3 py-2 text-xs text-foreground-muted">Searching…</div>
      {:else}
        {#each results as result (result.id)}
          <button
            type="button"
            class="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-surface-subtle transition-colors"
            onclick={() => selectTask(result.id)}
          >
            {#if result.list}
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                style="background-color: {result.list.color || 'hsl(var(--foreground-muted))'}"
              ></div>
            {/if}
            <span class="flex-1 truncate">{result.title}</span>
            {#if result.list}
              <span class="text-xs text-foreground-muted truncate max-w-[80px]">{result.list.name}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {:else if query.trim() && !loading}
    <div class="mt-1 px-3 py-2 text-xs text-foreground-muted">No tasks found</div>
  {/if}
</div>
