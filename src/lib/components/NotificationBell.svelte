<script lang="ts">
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '$lib/components/ui/popover/index.js';
  import { Bell } from '@lucide/svelte';
  import type { Notification } from '$lib/types/index.js';

  type NotificationWithTask = Notification & { task?: { title: string } | null };

  let { unreadCount = $bindable(0) }: { unreadCount: number } = $props();

  let notifications = $state<NotificationWithTask[]>([]);
  let loading = $state(false);
  let open = $state(false);

  async function fetchNotifications() {
    loading = true;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) notifications = await res.json();
    } finally {
      loading = false;
    }
  }

  async function markRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const n = notifications.find((n) => n.id === id);
    if (n && !n.is_read) {
      n.is_read = true;
      unreadCount = Math.max(0, unreadCount - 1);
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    notifications.forEach((n) => (n.is_read = true));
    unreadCount = 0;
  }

  function formatType(type: string): string {
    switch (type) {
      case 'reminder': return 'Reminder';
      case 'due': return 'Due';
      case 'assigned': return 'Assigned';
      default: return type;
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  $effect(() => {
    if (open) fetchNotifications();
  });
</script>

<Popover bind:open>
  <PopoverTrigger>
    <button
      type="button"
      class="relative p-1 text-foreground-secondary hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell class="w-5 h-5" />
      {#if unreadCount > 0}
        <span
          class="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-[10px] font-medium text-white px-1"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      {/if}
    </button>
  </PopoverTrigger>
  <PopoverContent class="w-80 p-0" align="end">
    <div class="flex items-center justify-between px-3 py-2 border-b">
      <span class="text-sm font-medium">Notifications</span>
      {#if unreadCount > 0}
        <button
          type="button"
          class="text-xs text-primary hover:text-primary-hover"
          onclick={markAllRead}
        >Mark all read</button>
      {/if}
    </div>
    <div class="max-h-72 overflow-y-auto">
      {#if loading}
        <div class="py-6 text-center text-sm text-foreground-secondary">Loading...</div>
      {:else if notifications.length === 0}
        <div class="py-6 text-center text-sm text-foreground-secondary">No notifications</div>
      {:else}
        {#each notifications as n (n.id)}
          <button
            type="button"
            class="w-full text-left px-3 py-2.5 hover:bg-surface-subtle border-b last:border-b-0 {!n.is_read ? 'bg-primary/5' : ''}"
            onclick={() => { if (!n.is_read) markRead(n.id); }}
          >
            <div class="flex items-start gap-2">
              {#if !n.is_read}
                <span class="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
              {:else}
                <span class="mt-1.5 w-2 h-2 flex-shrink-0"></span>
              {/if}
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate {!n.is_read ? 'font-medium' : ''}">
                  {n.task?.title || 'Task'}
                </p>
                <p class="text-xs text-foreground-secondary">
                  {formatType(n.type)} · {timeAgo(n.created_at)}
                </p>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </PopoverContent>
</Popover>
