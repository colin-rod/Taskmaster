<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { Settings, Search, Plus, Sun, Moon } from '@lucide/svelte';
  import { theme, toggleTheme } from '$lib/stores/theme.js';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomTabBar from '$lib/components/BottomTabBar.svelte';
  import CreateListDialog from '$lib/components/CreateListDialog.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { Task } from '$lib/types/index.js';

  const { children, data } = $props();

  let unreadCount = $derived(data.unreadCount ?? 0);

  let showCreateListDialog = $state(false);
  let searchOpen = $state(false);
  let commandPaletteOpen = $state(false);
  // Single unified "add task" surface — the same bottom sheet is opened from the
  // header button, the desktop FAB, the mobile FAB, and the global `c` shortcut.
  let quickAddOpen = $state(false);

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);
  let taskLoading = $state(false);

  function openQuickAdd() {
    quickAddOpen = true;
  }

  // Global keyboard shortcuts.
  function onGlobalKeydown(e: KeyboardEvent) {
    // Cmd/Ctrl+K opens the command palette from anywhere (even while typing).
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }

    // `c` opens Quick Add — but not while typing or with another overlay open.
    if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    if (quickAddOpen || sheetOpen || searchOpen || showCreateListDialog || commandPaletteOpen) return;
    e.preventDefault();
    openQuickAdd();
  }

  async function onSelectTask(taskId: string) {
    selectedTask = null;
    taskLoading = true;
    sheetOpen = true;
    const res = await fetch(`/api/tasks/${taskId}`);
    taskLoading = false;
    if (!res.ok) { sheetOpen = false; return; }
    const { task } = await res.json();
    selectedTask = task;
  }
</script>

<svelte:window onkeydown={onGlobalKeydown} />

<div class="h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b bg-background px-4 py-3.5 pt-safe [box-shadow:var(--shadow-header)]">
    <div class="flex items-center gap-4">
      <h1 class="shrink-0 flex items-center gap-2 leading-none"
          style="font-size: 1.25rem; font-weight: 650; letter-spacing: -0.02em;">
        <svg viewBox="0 0 512 512" class="w-7 h-7 shrink-0 rounded-lg" aria-hidden="true">
          <defs><linearGradient id="icon-bg" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#6D5CF6"/><stop offset="100%" stop-color="#4A38D9"/></linearGradient></defs>
          <rect width="512" height="512" rx="112" ry="112" fill="url(#icon-bg)"/>
          <rect x="120" y="110" width="272" height="48" rx="8" fill="#fff"/>
          <rect x="232" y="110" width="48" height="260" rx="8" fill="#fff"/>
          <polyline points="178,340 248,400 378,260" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Taskmaster
      </h1>
      <div class="hidden md:flex items-center gap-1 min-w-0 ml-auto">
        <div class="flex items-center mr-1">
          <Button
            size="sm"
            class="gap-1.5 rounded-lg"
            onclick={openQuickAdd}
            aria-label="Add task"
          >
            <Plus class="w-4 h-4" />
            <span>Add task</span>
            <kbd class="ml-0.5 hidden lg:inline-flex items-center rounded border border-primary-foreground/30 bg-primary-foreground/15 px-1.5 text-[10px] font-medium">C</kbd>
          </Button>
        </div>
        <div class="flex items-center">
          {#if searchOpen}
            <div class="w-56 max-w-[calc(100vw-7rem)]">
              <SearchBar {onSelectTask} onClose={() => { searchOpen = false; }} />
            </div>
          {:else}
            <button
              type="button"
              class="p-2.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
              onclick={() => { searchOpen = true; }}
              aria-label="Search tasks"
            >
              <Search class="w-4 h-4" />
            </button>
          {/if}
        </div>
        <div class="p-2 rounded-lg">
          <NotificationBell bind:unreadCount />
        </div>
        <button
          type="button"
          class="p-2.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
          onclick={toggleTheme}
          aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {#if $theme === 'dark'}
            <Sun class="w-4 h-4" />
          {:else}
            <Moon class="w-4 h-4" />
          {/if}
        </button>
        <a
          href="/settings"
          class="p-2.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
          aria-label="Settings"
        >
          <Settings class="w-4 h-4" />
        </a>
      </div>
    </div>
  </header>

  <!-- Body: sidebar + main -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Desktop sidebar -->
    <div class="hidden md:flex">
      <Sidebar
        filterCounts={data.filterCounts}
        lists={data.lists}
        onCreateList={() => { showCreateListDialog = true; }}
      />
    </div>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto px-4 py-6 pb-tab-safe md:pb-6 md:px-8">
      <div class="max-w-4xl mx-auto">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<!-- Desktop FAB: bottom-right, hidden on mobile -->
<button
  type="button"
  class="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 items-center justify-center
         rounded-full bg-primary text-primary-foreground [box-shadow:var(--shadow-lg)]
         hover:bg-primary-hover active:bg-primary-active transition-colors cursor-pointer"
  onclick={openQuickAdd}
  aria-label="Add task"
>
  <Plus class="w-6 h-6" />
</button>

<!-- Unified Quick Add surface — opened from header, FABs, and the `c` shortcut -->
<Sheet.Root bind:open={quickAddOpen}>
  <Sheet.Content side="bottom" class="rounded-t-xl px-4 pb-8 pt-4 md:pb-6">
    <div class="mx-auto w-full max-w-2xl">
      <Sheet.Header class="p-0">
        <Sheet.Title>Add task</Sheet.Title>
      </Sheet.Header>
      <div class="mt-2">
        <QuickAdd action="/inbox?/createTask" onClose={() => { quickAddOpen = false; }} />
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>

<BottomTabBar onAdd={openQuickAdd} />
<CreateListDialog bind:open={showCreateListDialog} />
<CommandPalette bind:open={commandPaletteOpen} {onSelectTask} onNewTask={openQuickAdd} />
<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} loading={taskLoading} />
<Toaster position="bottom-center" />
