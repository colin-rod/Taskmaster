<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let adding = $state(false);
  let nameValue = $state('');

  function getInitials(name: string | null, email: string | null): string {
    if (name) {
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (email ?? '?')[0].toUpperCase();
  }
</script>

<div class="container max-w-lg mx-auto px-4 py-8 md:py-16">
  <div class="mb-8 text-center">
    <svg viewBox="0 0 512 512" class="w-14 h-14 mx-auto mb-3 rounded-2xl" aria-hidden="true">
      <defs><linearGradient id="icon-bg" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#D04A12"/><stop offset="100%" stop-color="#9E2B07"/></linearGradient></defs>
      <rect width="512" height="512" rx="112" ry="112" fill="url(#icon-bg)"/>
      <rect x="120" y="110" width="272" height="48" rx="8" fill="#fff"/>
      <rect x="232" y="110" width="48" height="260" rx="8" fill="#fff"/>
      <polyline points="178,340 248,400 378,260" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h1 class="font-accent text-page-title">Taskmaster</h1>
    <p class="text-muted-foreground">Who's checking in?</p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    {#each data.profiles as profile}
      <form method="POST" action="?/select" use:enhance>
        <input type="hidden" name="profile_id" value={profile.id} />
        <button
          type="submit"
          class="w-full flex flex-col items-center gap-3 rounded-xl border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white overflow-hidden"
            style={!profile.avatar_url ? `background-color: ${profile.avatar_color ?? '#3B82F6'}` : ''}
          >
            {#if profile.avatar_url}
              <img src={profile.avatar_url} alt={profile.display_name ?? profile.email} class="h-full w-full object-cover" />
            {:else}
              {getInitials(profile.display_name, profile.email)}
            {/if}
          </div>
          <span class="text-sm font-medium">
            {profile.display_name ?? profile.email}
          </span>
        </button>
      </form>
    {/each}

    {#if adding}
      <form
        method="POST"
        action="?/create"
        use:enhance
        class="flex flex-col items-center gap-3 rounded-xl border bg-card p-6"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
          ?
        </div>
        <input
          type="text"
          name="display_name"
          bind:value={nameValue}
          placeholder="Your name"
          required
          class="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {#if form?.createError}
          <p class="text-xs text-destructive">{form.createError}</p>
        {/if}
        <div class="flex w-full gap-2">
          <button
            type="submit"
            class="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add
          </button>
          <button
            type="button"
            onclick={() => { adding = false; nameValue = ''; }}
            class="flex-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    {:else}
      <button
        onclick={() => (adding = true)}
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-6 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed text-2xl">
          +
        </div>
        <span class="text-sm font-medium">Add profile</span>
      </button>
    {/if}
  </div>
</div>
