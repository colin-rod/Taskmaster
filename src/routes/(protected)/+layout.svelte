<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { Settings } from '@lucide/svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';

  const { children, data } = $props();

  let unreadCount = $state(0);
  $effect(() => {
    unreadCount = data.unreadCount ?? 0;
  });
</script>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b bg-surface px-4 py-3">
    <div class="container mx-auto max-w-4xl flex items-center justify-between">
      <h1 class="font-accent text-lg font-semibold">Taskmaster</h1>
      <div class="flex items-center gap-4">
        <nav class="flex gap-4 text-sm">
          <a href="/today" class="text-foreground-secondary hover:text-foreground">Today</a>
          <a href="/upcoming" class="text-foreground-secondary hover:text-foreground">Upcoming</a>
          <a href="/inbox" class="text-foreground-secondary hover:text-foreground">Inbox</a>
          <a href="/assigned" class="text-foreground-secondary hover:text-foreground">Assigned</a>
          <a href="/lists" class="text-foreground-secondary hover:text-foreground">Lists</a>
        </nav>
        <NotificationBell bind:unreadCount />
        <a href="/settings" class="text-foreground-secondary hover:text-foreground" aria-label="Settings">
          <Settings class="w-4 h-4" />
        </a>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="flex-1 container mx-auto px-4 py-6 max-w-4xl">
    {@render children()}
  </main>
</div>

<Toaster position="bottom-center" />
