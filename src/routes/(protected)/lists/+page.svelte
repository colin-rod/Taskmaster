<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import type { PageData, ActionData } from './$types';
  import { LIST_COLORS } from '$lib/types/index.js';
  import { LIST_ICONS, getListIcon } from '$lib/utils/icons.js';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateForm = $state(false);
  let editingListId = $state<string | null>(null);
  let newListName = $state('');
  let newListColor = $state<string | null>(null);
  let newListIcon = $state('list');
  let editName = $state('');
  let editColor = $state<string | null>(null);
  let editIcon = $state('list');
  let creating = $state(false);

  function startEdit(list: { id: string; name: string; color: string | null; icon: string }) {
    editingListId = list.id;
    editName = list.name;
    editColor = list.color;
    editIcon = list.icon;
  }

  function cancelEdit() {
    editingListId = null;
  }
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-page-title font-accent">Task Lists</h1>
    <button
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      onclick={() => { showCreateForm = !showCreateForm; }}
    >
      {showCreateForm ? 'Cancel' : 'New List'}
    </button>
  </div>

  {#if showCreateForm}
    <form
      method="POST"
      action="?/createList"
      class="mb-6 rounded-md border bg-surface p-4"
      use:enhance={() => {
        creating = true;
        return async ({ result, update }) => {
          creating = false;
          if (result.type === 'success') {
            newListName = '';
            newListColor = null;
            newListIcon = 'list';
            showCreateForm = false;
            toast.success('List created');
          }
          await update();
        };
      }}
    >
      <div class="space-y-3">
        <div>
          <label for="new-list-name" class="text-sm font-medium">Name</label>
          <input
            id="new-list-name"
            name="name"
            type="text"
            bind:value={newListName}
            required
            placeholder="e.g. Household, Groceries..."
            class="select-input mt-1"
          />
        </div>
        <div>
          <p class="text-sm font-medium">Icon</p>
          <input type="hidden" name="icon" value={newListIcon} />
          <div class="grid grid-cols-10 gap-1 mt-1">
            {#each LIST_ICONS as item}
              {@const IconComponent = getListIcon(item.name)}
              <button
                type="button"
                title={item.label}
                class="w-7 h-7 rounded-md flex items-center justify-center transition-colors
                  {newListIcon === item.name
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground-secondary hover:bg-surface-subtle hover:text-foreground'}"
                onclick={() => { newListIcon = item.name; }}
              >
                <IconComponent class="w-4 h-4" />
              </button>
            {/each}
          </div>
        </div>
        <div>
          <p class="text-sm font-medium">Color</p>
          <input type="hidden" name="color" value={newListColor || ''} />
          <div class="flex gap-2 mt-1">
            {#each LIST_COLORS as color}
              <button
                type="button"
                aria-label={color}
                class="w-7 h-7 rounded-full border-2 transition-transform {newListColor === color ? 'border-foreground scale-110' : 'border-transparent'}"
                style="background-color: {color}"
                onclick={() => { newListColor = newListColor === color ? null : color; }}
              ></button>
            {/each}
          </div>
        </div>
        <button
          type="submit"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          disabled={creating || !newListName.trim()}
        >
          {creating ? 'Creating...' : 'Create List'}
        </button>
      </div>
    </form>
  {/if}

  {#if form?.error}
    <div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {form.error}
    </div>
  {/if}

  {#if data.lists.length === 0 && !showCreateForm}
    <div class="text-center py-12">
      <p class="text-foreground-secondary mb-4">No lists yet. Create one to organize your tasks.</p>
      <button
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        onclick={() => { showCreateForm = true; }}
      >
        Create your first list
      </button>
    </div>
  {:else}
    <div class="space-y-2">
      {#each data.lists as list (list.id)}
        {#if editingListId === list.id}
          <!-- Edit mode -->
          <form
            method="POST"
            action="?/updateList"
            class="rounded-md border bg-surface p-4"
            use:enhance={() => {
              return async ({ result, update }) => {
                if (result.type === 'success') {
                  editingListId = null;
                  toast.success('List updated');
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="id" value={list.id} />
            <div class="space-y-3">
              <input
                name="name"
                type="text"
                bind:value={editName}
                required
                class="select-input"
              />
              <div>
                <p class="text-sm font-medium">Icon</p>
                <input type="hidden" name="icon" value={editIcon} />
                <div class="grid grid-cols-10 gap-1 mt-1">
                  {#each LIST_ICONS as item}
                    {@const IconComponent = getListIcon(item.name)}
                    <button
                      type="button"
                      title={item.label}
                      class="w-7 h-7 rounded-md flex items-center justify-center transition-colors
                        {editIcon === item.name
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground-secondary hover:bg-surface-subtle hover:text-foreground'}"
                      onclick={() => { editIcon = item.name; }}
                    >
                      <IconComponent class="w-4 h-4" />
                    </button>
                  {/each}
                </div>
              </div>
              <input type="hidden" name="color" value={editColor || ''} />
              <div class="flex gap-2">
                {#each LIST_COLORS as color}
                  <button
                    type="button"
                    aria-label={color}
                    class="w-6 h-6 rounded-full border-2 {editColor === color ? 'border-foreground scale-110' : 'border-transparent'}"
                    style="background-color: {color}"
                    onclick={() => { editColor = editColor === color ? null : color; }}
                  ></button>
                {/each}
              </div>
              <div class="flex gap-2">
                <button type="submit" class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover">
                  Save
                </button>
                <button type="button" class="rounded-md border px-3 py-1.5 text-sm" onclick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        {:else}
          {@const IconComponent = getListIcon(list.icon)}
          <!-- Display mode -->
          <a
            href="/lists/{list.id}"
            class="flex items-center justify-between rounded-md border bg-surface p-4 hover:bg-surface-subtle transition-colors group"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
              >
                <IconComponent class="w-3.5 h-3.5 text-white" />
              </div>
              <span class="font-medium">{list.name}</span>
              {#if list.members && list.members.length > 0}
                <span class="text-metadata">{list.members.length} member{list.members.length !== 1 ? 's' : ''}</span>
              {/if}
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                class="rounded px-2 py-1 text-xs text-foreground-secondary hover:bg-surface-subtle"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(list); }}
              >
                Edit
              </button>
              <form
                method="POST"
                action="?/deleteList"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'success') {
                      toast.success('List deleted');
                    }
                    await update();
                  };
                }}
              >
                <input type="hidden" name="id" value={list.id} />
                <button
                  type="submit"
                  class="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  onclick={(e) => { e.stopPropagation(); if (!confirm('Delete this list? Tasks will be moved to Inbox.')) { e.preventDefault(); } }}
                >
                  Delete
                </button>
              </form>
            </div>
          </a>
        {/if}
      {/each}
    </div>
  {/if}
</div>
