<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

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
    <h1 class="font-accent text-page-title">Taskmaster</h1>
    <p class="text-muted-foreground">Who's checking in?</p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    {#each data.profiles as profile}
      <form method="POST" use:enhance>
        <input type="hidden" name="profile_id" value={profile.id} />
        <button
          type="submit"
          class="w-full flex flex-col items-center gap-3 rounded-xl border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
            style="background-color: {profile.avatar_color ?? '#3B82F6'}"
          >
            {getInitials(profile.display_name, profile.email)}
          </div>
          <span class="text-sm font-medium">
            {profile.display_name ?? profile.email}
          </span>
        </button>
      </form>
    {/each}
  </div>

  {#if data.profiles.length === 0}
    <p class="text-center text-muted-foreground mt-8">
      No profiles found. Add profiles to the database to get started.
    </p>
  {/if}
</div>
