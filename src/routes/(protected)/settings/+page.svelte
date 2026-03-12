<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { subscribeToPush, unsubscribeFromPush, getExistingSubscription, getPushPermissionState } from '$lib/push.js';

  let permissionState = $state<NotificationPermission>('default');
  let isSubscribed = $state(false);
  let loading = $state(false);
  let supported = $state(false);

  $effect(() => {
    supported = 'serviceWorker' in navigator && 'PushManager' in window;
    if (!supported) return;

    permissionState = getPushPermissionState();
    getExistingSubscription().then((sub) => {
      isSubscribed = !!sub;
    });
  });

  async function toggleNotifications() {
    loading = true;
    try {
      if (isSubscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          isSubscribed = false;
          toast.success('Push notifications disabled');
        } else {
          toast.error('Failed to disable notifications');
        }
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          isSubscribed = true;
          permissionState = getPushPermissionState();
          toast.success('Push notifications enabled');
        } else {
          permissionState = getPushPermissionState();
          if (permissionState === 'denied') {
            toast.error('Notification permission denied. Please enable in browser settings.');
          } else {
            toast.error('Failed to enable notifications');
          }
        }
      }
    } finally {
      loading = false;
    }
  }
</script>

<div>
  <h1 class="text-page-title font-accent mb-6">Settings</h1>

  <div class="space-y-6">
    <!-- Switch Profile -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-1">Profile</h2>
      <p class="text-sm text-foreground-secondary mb-3">
        Switch to a different household member.
      </p>
      <form method="POST" action="?/switchProfile">
        <button
          type="submit"
          class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Switch Profile
        </button>
      </form>
    </div>

    <!-- Push Notifications -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-1">Push Notifications</h2>
      {#if !supported}
        <p class="text-sm text-foreground-secondary">
          Push notifications are not supported in this browser.
        </p>
      {:else if permissionState === 'denied'}
        <p class="text-sm text-foreground-secondary">
          Notification permission was denied. To re-enable, update your browser's site settings for this page.
        </p>
      {:else}
        <p class="text-sm text-foreground-secondary mb-3">
          {isSubscribed
            ? 'You will receive push notifications for task reminders.'
            : 'Enable to receive push notifications for task reminders.'}
        </p>
        <button
          type="button"
          class="rounded-md px-4 py-2 text-sm font-medium {isSubscribed
            ? 'border border-destructive/30 text-destructive hover:bg-destructive/10'
            : 'bg-primary text-primary-foreground hover:bg-primary-hover'} disabled:opacity-50"
          disabled={loading}
          onclick={toggleNotifications}
        >
          {#if loading}
            {isSubscribed ? 'Disabling...' : 'Enabling...'}
          {:else}
            {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
