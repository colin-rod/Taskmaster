<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { calendarSettings } from '$lib/stores/calendarSettings.js';
  import { subscribeToPush, unsubscribeFromPush, getExistingSubscription, getPushPermissionState } from '$lib/push.js';

  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Push notifications state
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

  // Profile editing state
  let editingName = $state(false);
  // svelte-ignore state_referenced_locally
  let nameValue = $state(data.profile?.display_name ?? '');
  // svelte-ignore state_referenced_locally
  let avatarPreviewUrl = $state<string | null>(data.profile?.avatar_url ?? null);

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      avatarPreviewUrl = URL.createObjectURL(file);
    }
  }

  function getInitials(name: string | null): string {
    if (name) {
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (data.profile?.email ?? '?')[0].toUpperCase();
  }

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
    <!-- Edit Profile -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-3">Edit Profile</h2>

      <!-- Avatar + photo upload -->
      <form
        method="POST"
        action="?/uploadAvatar"
        enctype="multipart/form-data"
        use:enhance
        class="flex items-center gap-4 mb-4"
      >
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white flex-shrink-0 overflow-hidden"
          style={!avatarPreviewUrl ? `background-color: ${data.profile?.avatar_color ?? '#3B82F6'}` : ''}
        >
          {#if avatarPreviewUrl}
            <img src={avatarPreviewUrl} alt="Profile" class="h-full w-full object-cover" />
          {:else}
            {getInitials(data.profile?.display_name ?? null)}
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <label class="cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted w-fit">
            Choose photo
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="sr-only"
              onchange={handleFileChange}
            />
          </label>
          <button
            type="submit"
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover w-fit"
          >
            Upload photo
          </button>
          {#if form?.avatarError}
            <p class="text-xs text-destructive">{form.avatarError}</p>
          {/if}
          {#if form?.avatarSuccess}
            <p class="text-xs text-green-600">Photo updated</p>
          {/if}
        </div>
      </form>

      <!-- Display name editing -->
      {#if editingName}
        <form
          method="POST"
          action="?/updateProfile"
          use:enhance={() => {
            const savedName = nameValue;
            return async ({ result, update }) => {
              if (result.type === 'success') {
                editingName = false;
                nameValue = savedName;
              }
              await update({ reset: false });
            };
          }}
          class="flex items-center gap-2"
        >
          <input
            type="text"
            name="display_name"
            bind:value={nameValue}
            class="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Your name"
          />
          <button
            type="submit"
            class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Save
          </button>
          <button
            type="button"
            onclick={() => {
              editingName = false;
              nameValue = data.profile?.display_name ?? '';
            }}
            class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        </form>
        {#if form?.updateError}
          <p class="text-xs text-destructive mt-1">{form.updateError}</p>
        {/if}
      {:else}
        <div class="flex items-center gap-2">
          <span class="text-sm">{nameValue || 'No name set'}</span>
          <button
            type="button"
            onclick={() => { editingName = true; }}
            class="text-xs text-foreground-secondary hover:text-foreground underline"
          >
            Edit
          </button>
        </div>
        {#if form?.updateSuccess}
          <p class="text-xs text-green-600 mt-1">Name updated</p>
        {/if}
      {/if}
    </div>

    <!-- Switch Profile -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-1">Switch Profile</h2>
      <p class="text-sm text-foreground-secondary mb-3">
        Sign in as a different person in your household.
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

    <!-- Calendar -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-1">Calendar</h2>
      <p class="text-sm text-foreground-secondary mb-3">
        Choose which hours appear by default in the calendar.
      </p>
      <div class="flex items-center gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-foreground-secondary" for="wh-start">Start</label>
          <select
            id="wh-start"
            class="rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={$calendarSettings.workingHoursStart}
            onchange={(e) => calendarSettings.update((s) => ({ ...s, workingHoursStart: Number((e.currentTarget as HTMLSelectElement).value) }))}
          >
            {#each Array.from({ length: 16 }, (_, i) => i + 6) as h}
              <option value={h}>{h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}</option>
            {/each}
          </select>
        </div>
        <span class="text-sm text-foreground-secondary mt-4">to</span>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-foreground-secondary" for="wh-end">End</label>
          <select
            id="wh-end"
            class="rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={$calendarSettings.workingHoursEnd}
            onchange={(e) => calendarSettings.update((s) => ({ ...s, workingHoursEnd: Number((e.currentTarget as HTMLSelectElement).value) }))}
          >
            {#each Array.from({ length: 16 }, (_, i) => i + 8) as h}
              <option value={h}>{h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Push Notifications -->
    <div class="rounded-lg border p-4">
      <h2 class="text-sm font-medium mb-1">Push Notifications</h2>
      {#if !supported}
        <p class="text-sm text-foreground-secondary">
          Your browser doesn't support push notifications. Try Chrome, Edge, or Safari on desktop.
        </p>
      {:else if permissionState === 'denied'}
        <p class="text-sm text-foreground-secondary">
          Notifications are blocked for this site. To turn them on, open your browser's site settings and allow notifications.
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
