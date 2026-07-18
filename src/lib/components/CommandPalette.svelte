<script lang="ts">
  import { goto } from '$app/navigation';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Search, Plus, Sun, Moon, CornerDownLeft } from '@lucide/svelte';
  import { inboxNavItem, smartViewNavItems } from '$lib/config/nav.js';
  import { theme, toggleTheme } from '$lib/stores/theme.js';
  import type { SearchResult } from '$lib/types/index.js';
  import type { Component } from 'svelte';

  let {
    open = $bindable(false),
    onSelectTask,
    onNewTask,
  }: {
    open?: boolean;
    onSelectTask: (taskId: string) => void;
    onNewTask: () => void;
  } = $props();

  type Command = {
    id: string;
    label: string;
    icon: Component;
    group: 'Actions' | 'Go to';
    keywords?: string;
    run: () => void;
  };

  // Static commands: global actions + jump-to-view navigation.
  let staticCommands = $derived<Command[]>([
    {
      id: 'action:new-task',
      label: 'New task',
      icon: Plus,
      group: 'Actions',
      keywords: 'add create',
      run: () => { close(); onNewTask(); },
    },
    {
      id: 'action:toggle-theme',
      label: $theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: $theme === 'dark' ? Sun : Moon,
      group: 'Actions',
      keywords: 'theme dark light appearance',
      run: () => { toggleTheme(); },
    },
    ...[inboxNavItem, ...smartViewNavItems].map((item) => ({
      id: `nav:${item.href}`,
      label: item.label,
      icon: item.icon,
      group: 'Go to' as const,
      keywords: item.href,
      run: () => { close(); goto(item.href); },
    })),
  ]);

  let query = $state('');
  let taskResults = $state<SearchResult[]>([]);
  let searching = $state(false);
  let activeIndex = $state(0);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Reset when opened.
  $effect(() => {
    if (open) {
      query = '';
      taskResults = [];
      activeIndex = 0;
    }
  });

  let filteredCommands = $derived(
    query.trim()
      ? staticCommands.filter((c) =>
          (c.label + ' ' + (c.keywords ?? '')).toLowerCase().includes(query.trim().toLowerCase())
        )
      : staticCommands
  );

  // Flattened, ordered list of selectable rows (commands first, then tasks).
  type Row =
    | { kind: 'command'; command: Command }
    | { kind: 'task'; task: SearchResult };
  let rows = $derived<Row[]>([
    ...filteredCommands.map((command) => ({ kind: 'command' as const, command })),
    ...taskResults.map((task) => ({ kind: 'task' as const, task })),
  ]);

  // Keep the active index in range as rows change.
  $effect(() => {
    if (activeIndex >= rows.length) activeIndex = Math.max(0, rows.length - 1);
  });

  function close() {
    open = false;
  }

  function onQueryInput() {
    activeIndex = 0;
    clearTimeout(debounceTimer);
    const q = query.trim();
    if (!q) {
      taskResults = [];
      searching = false;
      return;
    }
    searching = true;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        taskResults = (data.tasks ?? []).slice(0, 8);
      } catch {
        taskResults = [];
      } finally {
        searching = false;
      }
    }, 250);
  }

  function runRow(row: Row) {
    if (row.kind === 'command') {
      row.command.run();
    } else {
      close();
      onSelectTask(row.task.id);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = rows.length ? (activeIndex + 1) % rows.length : 0;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = rows.length ? (activeIndex - 1 + rows.length) % rows.length : 0;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) runRow(row);
    }
  }

  // Group boundaries for section labels.
  let showActionsHeader = $derived(filteredCommands.some((c) => c.group === 'Actions'));
  let firstGoToIndex = $derived(filteredCommands.findIndex((c) => c.group === 'Go to'));
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="p-0 gap-0 overflow-hidden sm:max-w-[560px] top-[15%] translate-y-0"
    showCloseButton={false}
  >
    <Dialog.Title class="sr-only">Command palette</Dialog.Title>
    <div class="flex items-center gap-2 border-b border-border px-4">
      <Search class="w-4 h-4 text-foreground-muted shrink-0" />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        autofocus
        bind:value={query}
        oninput={onQueryInput}
        onkeydown={onKeydown}
        type="text"
        placeholder="Search tasks or jump to…"
        class="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-foreground-muted"
      />
    </div>

    <div class="max-h-[360px] overflow-y-auto py-1.5">
      {#if rows.length === 0}
        <div class="px-4 py-6 text-center text-sm text-foreground-muted">
          {searching ? 'Searching…' : 'No results'}
        </div>
      {:else}
        {#each rows as row, i (row.kind === 'command' ? row.command.id : 'task:' + row.task.id)}
          {#if row.kind === 'command' && i === 0 && showActionsHeader}
            <p class="section-header px-4 pt-2 pb-1">Actions</p>
          {/if}
          {#if row.kind === 'command' && i === firstGoToIndex && firstGoToIndex > 0}
            <p class="section-header px-4 pt-2 pb-1">Go to</p>
          {/if}
          {#if row.kind === 'task' && (i === filteredCommands.length)}
            <p class="section-header px-4 pt-2 pb-1">Tasks</p>
          {/if}
          <button
            type="button"
            class="flex items-center gap-2.5 w-full px-4 py-2 text-left text-sm transition-colors
              {i === activeIndex ? 'bg-primary-tint text-foreground' : 'text-foreground-secondary hover:bg-surface-subtle'}"
            onmousemove={() => { activeIndex = i; }}
            onclick={() => runRow(row)}
          >
            {#if row.kind === 'command'}
              {@const Icon = row.command.icon}
              <Icon class="w-4 h-4 shrink-0 {i === activeIndex ? 'text-primary' : 'text-foreground-muted'}" />
              <span class="flex-1 truncate">{row.command.label}</span>
            {:else}
              {#if row.task.list}
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: {row.task.list.color || 'hsl(var(--foreground-muted))'}"></span>
              {:else}
                <span class="w-2 h-2 rounded-full shrink-0 bg-foreground-muted/40"></span>
              {/if}
              <span class="flex-1 truncate text-foreground">{row.task.title}</span>
              {#if row.task.list}
                <span class="text-xs text-foreground-muted truncate max-w-[100px]">{row.task.list.name}</span>
              {/if}
            {/if}
            {#if i === activeIndex}
              <CornerDownLeft class="w-3.5 h-3.5 shrink-0 text-foreground-muted" />
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
