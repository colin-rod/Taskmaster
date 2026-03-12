<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import type { Profile } from '$lib/types/index.js';

  let {
    taskId,
    assignee,
    members = [],
    disabled = false,
  }: {
    taskId: string;
    assignee: Profile | null | undefined;
    members?: { user_id: string; profile?: Profile }[];
    disabled?: boolean;
  } = $props();

  let open = $state(false);

  async function assign(userId: string | null) {
    open = false;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_user_id: userId }),
      });
      if (!res.ok) {
        toast.error('Failed to update assignee');
      } else {
        await invalidateAll();
      }
    } catch {
      toast.error('Failed to update assignee');
    }
  }

  function displayName(profile?: Profile): string {
    return profile?.display_name ?? profile?.email ?? 'Unknown';
  }

  function initials(profile?: Profile): string {
    const name = profile?.display_name ?? profile?.email ?? '?';
    return name.charAt(0).toUpperCase();
  }
</script>

{#if members.length > 0}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled}>
      <span class="text-xs text-foreground-secondary flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
        {#if assignee}
          <span class="w-4 h-4 rounded-full bg-foreground-muted text-[9px] font-medium text-primary-foreground flex items-center justify-center">
            {initials(assignee)}
          </span>
          <span class="truncate max-w-[80px]">{displayName(assignee)}</span>
        {:else}
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          Unassigned
        {/if}
      </span>
    </Popover.Trigger>
    <Popover.Content class="w-48 p-1" align="start">
      <button
        type="button"
        class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
          {!assignee ? 'bg-surface-subtle font-medium' : ''}"
        onclick={() => assign(null)}
      >
        Unassigned
      </button>
      {#each members as member (member.user_id)}
        <button
          type="button"
          class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors
            {assignee?.id === member.user_id ? 'bg-surface-subtle font-medium' : ''}"
          onclick={() => assign(member.user_id)}
        >
          <span class="w-5 h-5 rounded-full bg-foreground-muted text-[10px] font-medium text-primary-foreground flex items-center justify-center flex-shrink-0">
            {initials(member.profile)}
          </span>
          <span class="truncate">{displayName(member.profile)}</span>
        </button>
      {/each}
    </Popover.Content>
  </Popover.Root>
{:else if assignee}
  <span class="text-xs text-foreground-secondary flex items-center gap-1">
    <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
    {displayName(assignee)}
  </span>
{/if}
