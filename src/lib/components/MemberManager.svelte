<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '$lib/components/ui/dialog/index.js';
  import type { TaskList, TaskListMember } from '$lib/types/index.js';
  import { X, Users } from '@lucide/svelte';

  let {
    list,
    open = $bindable(false),
  }: {
    list: TaskList;
    open: boolean;
  } = $props();

  let email = $state('');
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
            class="text-xs border rounded px-1.5 py-1 bg-surface"
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
          <button
            type="submit"
            class="p-1 text-foreground-muted hover:text-destructive transition-colors"
            aria-label="Remove member"
          >
            <X class="w-4 h-4" />
          </button>
        </form>
      </div>
    {/each}

    <!-- Add member -->
    <div class="border-t pt-4 mt-2">
      <p class="text-sm font-medium mb-2">Add member</p>
      {#if errorMessage}
        <div class="mb-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
          {errorMessage}
        </div>
      {/if}
      <form
        method="POST"
        action="?/addMember"
        class="flex items-end gap-2"
        use:enhance={() => {
          adding = true;
          errorMessage = '';
          return async ({ result, update }) => {
            adding = false;
            if (result.type === 'success') {
              email = '';
              toast.success('Member added');
            } else if (result.type === 'failure') {
              errorMessage = (result.data as Record<string, string>)?.error ?? 'Failed to add member';
            }
            await update();
          };
        }}
      >
        <input type="hidden" name="list_id" value={list.id} />
        <div class="flex-1">
          <input
            name="email"
            type="email"
            bind:value={email}
            placeholder="Email address"
            required
            class="select-input w-full text-sm"
            disabled={adding}
          />
        </div>
        <select name="role" bind:value={role} class="select-input text-sm">
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          type="submit"
          class="rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          disabled={adding || !email.trim()}
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </form>
    </div>
  </DialogContent>
</Dialog>
