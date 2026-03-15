<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { Settings, Search } from '@lucide/svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomTabBar from '$lib/components/BottomTabBar.svelte';
  import CreateListDialog from '$lib/components/CreateListDialog.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import TaskSheet from '$lib/components/TaskSheet.svelte';
  import type { Task } from '$lib/types/index.js';

  const { children, data } = $props();

  let unreadCount = $state(0);
  $effect(() => {
    unreadCount = data.unreadCount ?? 0;
  });

  let showCreateListDialog = $state(false);
  let searchOpen = $state(false);

  let selectedTask = $state<Task | null>(null);
  let sheetOpen = $state(false);

  async function onSelectTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (!res.ok) return;
    const { task } = await res.json();
    selectedTask = task;
    sheetOpen = true;
  }
</script>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b bg-surface px-4 py-3">
    <div class="flex items-center justify-between">
      <h1 class="font-accent text-lg font-semibold">Taskmaster</h1>
      <div class="flex items-center gap-4">
        <div class="relative">
          <button
            type="button"
            class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
            onclick={() => { searchOpen = !searchOpen; }}
            aria-label="Search tasks"
          >
            <Search class="w-4 h-4" />
          </button>
          {#if searchOpen}
            <div class="absolute right-0 top-full mt-2 w-72 z-50">
              <SearchBar {onSelectTask} onClose={() => { searchOpen = false; }} />
            </div>
          {/if}
        </div>
        <NotificationBell bind:unreadCount />
        <a href="/settings" class="text-foreground-secondary hover:text-foreground" aria-label="Settings">
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
    <main class="flex-1 overflow-y-auto px-4 py-6 pb-20 md:pb-6 md:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="mb-6">
          <QuickAdd />
        </div>
        {@render children()}
      </div>
    </main>
  </div>
</div>

<BottomTabBar />
<CreateListDialog bind:open={showCreateListDialog} />
<TaskSheet bind:task={selectedTask} bind:open={sheetOpen} />
<Toaster position="bottom-center" />
