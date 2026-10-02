<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '$lib/components/ui/dialog/index.js';
  import type { TaskList, Profile } from '$lib/types/index.js';
  import { X } from '@lucide/svelte';

  let {
    list,
    addableProfiles = [],
    open = $bindable(false),
  }: {
    list: TaskList;
    /** Household profiles that aren't members of this list yet. */
    addableProfiles?: Pick<Profile, 'id' | 'email' | 'display_name' | 'avatar_color' | 'avatar_url'>[];
    open: boolean;
  } = $props();

  let role = $state<'editor' | 'viewer'>('editor');
  let adding = $state(false);
  let errorMessage = $state('');

  let members = $derived(list.members ?? []);
  let nonOwnerMembers = $derived(members.filter((m) => m.role !== 'owner'));
  let ownerMember = $derived(members.find((m) => m.role === 'owner'));
</script>

<Dialog bind:open>
  <DialogContent class="max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Members</DialogTitle>
      <DialogDescription class="sr-only">Manage list members</DialogDescription>
    </DialogHeader>

    <!-- Owner -->
    {#if ownerMember}
      <div class="flex items-center gap-3 py-2">
        <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
          {(ownerMember.profile?.display_name ?? ownerMember.profile?.email ?? '?').charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{ownerMember.profile?.display_name ?? ownerMember.profile?.email}</p>
          {#if ownerMember.profile?.display_name}
            <p class="text-xs text-foreground-secondary truncate">{ownerMember.profile?.email}</p>
          {/if}
        </div>
        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Owner</span>
      </div>
    {/if}

    <!-- Other members -->
    {#each nonOwnerMembers as member (member.user_id)}
      <div class="flex items-center gap-3 py-2 border-t">
        <div class="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-xs font-medium flex-shrink-0 text-foreground-secondary">
          {(member.profile?.display_name ?? member.profile?.email ?? '?').charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{member.profile?.display_name ?? member.profile?.email}</p>
          {#if member.profile?.display_name}
            <p class="text-xs text-foreground-secondary truncate">{member.profile?.email}</p>
          {/if}
        </div>

        <!-- Role select -->
        <form
          method="POST"
          action="?/updateMemberRole"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                toast.success('Role updated');
              }
              await update();
            };
          }}
        >
          <input type="hidden" name="list_id" value={list.id} />
          <input type="hidden" name="user_id" value={member.user_id} />
          <select
            name="role"
            class="text-xs border rounded px-1.5 py-1 bg-surface min-h-11 md:min-h-0"
            value={member.role}
            onchange={(e) => { e.currentTarget.form?.requestSubmit(); }}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </form>

        <!-- Remove -->
        <form
          method="POST"
          action="?/removeMember"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                toast.success('Member removed');
              }
              await update();
            };
          }}
        >
          <input type="hidden" name="list_id" value={list.id} />
          <input type="hidden" name="user_id" value={member.user_id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            class="text-foreground-muted hover:text-destructive min-h-11 min-w-11 md:min-h-0 md:min-w-0"
            aria-label="Remove member"
          >
            <X class="w-4 h-4" />
          </Button>
        </form>
      </div>
    {/each}

    <!-- Add member: pick from the household's profiles -->
    <div class="border-t pt-4 mt-2">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-sm font-medium">Add member</p>
        {#if addableProfiles.length > 0}
          <label class="flex items-center gap-2 text-xs text-foreground-secondary">
            Role
            <select bind:value={role} class="select-input text-sm min-h-11 md:min-h-0">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        {/if}
      </div>
      {#if errorMessage}
        <div class="mb-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
          {errorMessage}
        </div>
      {/if}
      {#if addableProfiles.length === 0}
        <p class="text-sm text-foreground-secondary">
          Everyone in your household is already on this list. New people can join from the
          profile picker (Settings → Switch Profile → Add profile).
        </p>
      {:else}
        <ul class="flex flex-col gap-1">
          {#each addableProfiles as profile (profile.id)}
            <li>
              <form
                method="POST"
                action="?/addMember"
                use:enhance={() => {
                  adding = true;
                  errorMessage = '';
                  return async ({ result, update }) => {
                    adding = false;
                    if (result.type === 'success') {
                      toast.success('Member added');
                    } else if (result.type === 'failure') {
                      errorMessage = (result.data as Record<string, string>)?.error ?? 'Failed to add member';
                    }
                    await update();
                  };
                }}
              >
                <input type="hidden" name="list_id" value={list.id} />
                <input type="hidden" name="user_id" value={profile.id} />
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  disabled={adding}
                  class="w-full min-h-11 flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  <span
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0 overflow-hidden"
                    style={!profile.avatar_url ? `background-color: ${profile.avatar_color ?? '#3B82F6'}` : ''}
                  >
                    {#if profile.avatar_url}
                      <img src={profile.avatar_url} alt="" class="h-full w-full object-cover" />
                    {:else}
                      {(profile.display_name ?? profile.email ?? '?').charAt(0).toUpperCase()}
                    {/if}
                  </span>
                  <span class="flex-1 min-w-0 text-sm font-medium truncate">{profile.display_name ?? profile.email}</span>
                  <span class="text-xs font-medium text-primary shrink-0">Add as {role}</span>
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </DialogContent>
</Dialog>
