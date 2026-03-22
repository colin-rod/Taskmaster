<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { Settings, Search, Plus } from '@lucide/svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomTabBar from '$lib/components/BottomTabBar.svelte';
  import CreateListDialog from '$lib/components/CreateListDialog.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import type { Task } from '$lib/types/index.js';

  const { children, data } = $props();

  let unreadCount = $derived(data.unreadCount ?? 0);

  let showCreateListDialog = $state(false);
  let searchOpen = $state(false);
  let quickAddOpen = $state(false);

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);
  let taskLoading = $state(false);

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

<div class="h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b bg-background px-4 py-3.5 [box-shadow:var(--shadow-header)]">
    <div class="flex items-center gap-4">
      <h1 class="font-accent shrink-0 flex items-center gap-2 leading-none"
          style="font-size: 1.375rem; font-weight: 800; letter-spacing: -0.03em; font-style: italic;">
        <svg viewBox="0 0 512 512" class="w-7 h-7 shrink-0 rounded-lg" aria-hidden="true">
          <defs><linearGradient id="icon-bg" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#D04A12"/><stop offset="100%" stop-color="#9E2B07"/></linearGradient></defs>
          <rect width="512" height="512" rx="112" ry="112" fill="url(#icon-bg)"/>
          <rect x="120" y="110" width="272" height="48" rx="8" fill="#fff"/>
          <rect x="232" y="110" width="48" height="260" rx="8" fill="#fff"/>
          <polyline points="178,340 248,400 378,260" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Taskmaster
      </h1>
      <div class="hidden md:flex items-center gap-1 min-w-0 ml-auto">
        <div class="flex items-center">
          {#if quickAddOpen}
            <div class="w-full max-w-md">
              <QuickAdd action="/inbox?/createTask" compact onClose={() => { quickAddOpen = false; }} />
            </div>
          {:else}
            <button
              type="button"
              class="p-2.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
              onclick={() => { quickAddOpen = true; }}
              aria-label="Add task"
            >
              <Plus class="w-4 h-4" />
            </button>
          {/if}
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

<BottomTabBar />
<CreateListDialog bind:open={showCreateListDialog} />
<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} loading={taskLoading} />
<Toaster position="bottom-center" />
