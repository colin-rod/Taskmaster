<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Tag, Check, Pencil, Trash2 } from '@lucide/svelte';
  import type { Label } from '$lib/types/index.js';
  import { LABEL_COLORS } from '$lib/types/index.js';

  let {
    taskId,
    listId,
    currentLabels = [],
    disabled = false,
  }: {
    taskId: string;
    listId: string;
    currentLabels: Label[];
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  let allLabels = $state<Label[]>([]);
  let search = $state('');
  let editingId = $state<string | null>(null);
  let editName = $state('');
  let editColor = $state('');
  let loading = $state(false);

  let filtered = $derived(
    allLabels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
  );

  let showCreate = $derived(
    search.trim() !== '' && !allLabels.some((l) => l.name.toLowerCase() === search.toLowerCase().trim())
  );

  async function fetchLabels() {
    loading = true;
    try {
      const res = await fetch(`/api/labels?list_id=${listId}`);
      if (res.ok) {
        const data = await res.json();
        allLabels = data.labels;
      }
    } finally {
      loading = false;
    }
  }

  function isAttached(labelId: string): boolean {
    return currentLabels.some((l) => l.id === labelId);
  }

  async function toggleLabel(labelId: string) {
    const attached = isAttached(labelId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/labels`, {
        method: attached ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_id: labelId }),
      });
      if (!res.ok) {
        toast.error('Failed to update labels');
        return;
      }
      await invalidateAll();
    } catch {
      toast.error('Failed to update labels');
    }
  }

  async function createAndAttach() {
    const name = search.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId, name }),
      });
      if (!res.ok) {
        toast.error('Failed to create label');
        return;
      }
      const { label } = await res.json();
      allLabels = [...allLabels, label];
      search = '';
      await toggleLabel(label.id);
    } catch {
      toast.error('Failed to create label');
    }
  }

  function startEdit(label: Label) {
    editingId = label.id;
    editName = label.name;
    editColor = label.color;
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      const res = await fetch(`/api/labels/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (!res.ok) {
        toast.error('Failed to update label');
        return;
      }
      editingId = null;
      await fetchLabels();
      await invalidateAll();
    } catch {
      toast.error('Failed to update label');
    }
  }

  async function deleteLabel(id: string) {
    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to delete label');
        return;
      }
      editingId = null;
      await fetchLabels();
      await invalidateAll();
    } catch {
      toast.error('Failed to delete label');
    }
  }

  $effect(() => {
    if (open) {
      fetchLabels();
      search = '';
      editingId = null;
    }
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger {disabled}>
    <span class="text-xs text-foreground-secondary flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
      <Tag class="w-3 h-3" />
      {#if currentLabels.length > 0}
        {currentLabels.length} label{currentLabels.length !== 1 ? 's' : ''}
      {:else}
        Add label
      {/if}
    </span>
  </Popover.Trigger>
  <Popover.Content class="w-56 p-1" align="start">
    <!-- Search input -->
    <div class="px-2 pb-1">
      <input
        type="text"
        bind:value={search}
        placeholder="Search or create..."
        class="w-full text-sm bg-transparent border-b border-border-default outline-none py-1 placeholder:text-foreground-muted"
      />
    </div>

    {#if loading}
      <div class="px-2 py-2 text-xs text-foreground-muted">Loading...</div>
    {:else}
      <!-- Label list -->
      <div class="max-h-48 overflow-y-auto">
        {#each filtered as label (label.id)}
          {#if editingId === label.id}
            <!-- Edit mode -->
            <div class="p-2 space-y-2">
              <input
                type="text"
                bind:value={editName}
                class="w-full text-sm bg-surface-subtle border border-border-default rounded px-2 py-1 outline-none"
                onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); }}
              />
              <div class="flex flex-wrap gap-1">
                {#each LABEL_COLORS as color}
                  <button
                    type="button"
                    class="w-5 h-5 rounded-full border-2 transition-transform {editColor === color ? 'border-foreground scale-110' : 'border-transparent'}"
                    style="background: {color};"
                    onclick={() => { editColor = color; }}
                  ></button>
                {/each}
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex-1 text-xs bg-surface-subtle hover:bg-surface-hover rounded px-2 py-1 transition-colors"
                  onclick={saveEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  class="text-xs text-red-500 hover:bg-red-50 rounded px-2 py-1 transition-colors"
                  onclick={() => deleteLabel(label.id)}
                >
                  <Trash2 class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  class="text-xs text-foreground-muted hover:bg-surface-subtle rounded px-2 py-1 transition-colors"
                  onclick={() => { editingId = null; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <!-- Label row -->
            <div class="group flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-surface-subtle transition-colors">
              <button
                type="button"
                class="flex items-center gap-2 flex-1 text-sm text-left"
                onclick={() => toggleLabel(label.id)}
              >
                <span class="w-3 h-3 rounded-full flex-shrink-0" style="background: {label.color};"></span>
                <span class="truncate">{label.name}</span>
                {#if isAttached(label.id)}
                  <Check class="w-3 h-3 ml-auto text-foreground-secondary flex-shrink-0" />
                {/if}
              </button>
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onclick={() => startEdit(label)}
              >
                <Pencil class="w-3 h-3 text-foreground-muted hover:text-foreground" />
              </button>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Create new -->
      {#if showCreate}
        <button
          type="button"
          class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-surface-subtle transition-colors border-t border-border-default mt-1 pt-1.5"
          onclick={createAndAttach}
        >
          <Tag class="w-3 h-3 text-foreground-muted" />
          Create "<span class="font-medium">{search.trim()}</span>"
        </button>
      {/if}

      {#if !loading && filtered.length === 0 && !showCreate}
        <div class="px-2 py-2 text-xs text-foreground-muted">No labels yet</div>
      {/if}
    {/if}
  </Popover.Content>
</Popover.Root>
