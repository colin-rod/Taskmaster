<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { Settings } from '@lucide/svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomTabBar from '$lib/components/BottomTabBar.svelte';
  import CreateListDialog from '$lib/components/CreateListDialog.svelte';

  const { children, data } = $props();

  let unreadCount = $state(0);
  $effect(() => {
    unreadCount = data.unreadCount ?? 0;
  });

  let showCreateListDialog = $state(false);
</script>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b bg-surface px-4 py-3">
    <div class="flex items-center justify-between">
      <h1 class="font-accent text-lg font-semibold">Taskmaster</h1>
      <div class="flex items-center gap-4">
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
        {@render children()}
      </div>
    </main>
  </div>
</div>

<BottomTabBar />
<CreateListDialog bind:open={showCreateListDialog} />
<Toaster position="bottom-center" />
