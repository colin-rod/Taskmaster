<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { LIST_COLORS } from '$lib/types/index.js';
  import { LIST_ICONS, getListIcon } from '$lib/utils/icons.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';

  let {
    open = $bindable(false),
  }: {
    open?: boolean;
  } = $props();

  let name = $state('');
  let color = $state<string | null>(null);
  let icon = $state('list');
  let creating = $state(false);
  let PreviewIcon = $derived(getListIcon(icon));

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;

    creating = true;
    try {
      const formData = new FormData();
      formData.set('name', name.trim());
      formData.set('color', color || '');
      formData.set('icon', icon);

      const res = await fetch('/lists?/createList', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success('List created');
        name = '';
        color = null;
        icon = 'list';
        open = false;
        await invalidateAll();
      } else {
        toast.error('Failed to create list');
      }
    } catch {
      toast.error('Failed to create list');
    } finally {
      creating = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>New List</Dialog.Title>
      <Dialog.Description>Create a new task list to organize your tasks.</Dialog.Description>
    </Dialog.Header>
    <form onsubmit={handleSubmit} class="space-y-4 mt-2">
      <div class="flex justify-center">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style="background-color: {color || 'hsl(var(--foreground-muted))'}"
        >
          <PreviewIcon class="w-5 h-5 text-white" />
        </div>
      </div>
      <div>
        <label for="create-list-name" class="text-sm font-medium">Name</label>
        <input
          id="create-list-name"
          type="text"
          bind:value={name}
          required
          placeholder="e.g. Household, Groceries..."
          class="select-input mt-1"
        />
      </div>
      <div>
        <p class="text-sm font-medium">Icon</p>
        <div class="grid grid-cols-10 gap-1 mt-1">
          {#each LIST_ICONS as item}
            {@const IconComponent = getListIcon(item.name)}
            <button
              type="button"
              title={item.label}
              class="w-7 h-7 rounded-md flex items-center justify-center transition-colors
                {icon === item.name
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground-secondary hover:bg-surface-subtle hover:text-foreground'}"
              onclick={() => { icon = item.name; }}
            >
              <IconComponent class="w-4 h-4" />
            </button>
          {/each}
        </div>
      </div>
      <div>
        <p class="text-sm font-medium">Color</p>
        <input type="hidden" name="color" value={color || ''} />
        <div class="flex gap-2 mt-1">
          {#each LIST_COLORS as c}
            <button
              type="button"
              aria-label={c}
              class="w-7 h-7 rounded-full border-2 transition-transform {color === c ? 'border-foreground scale-110' : 'border-transparent'}"
              style="background-color: {c}"
              onclick={() => { color = color === c ? null : c; }}
            ></button>
          {/each}
        </div>
      </div>
      <Dialog.Footer>
        <button
          type="button"
          class="rounded-md border px-4 py-2 text-sm"
          onclick={() => { open = false; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          disabled={creating || !name.trim()}
        >
          {creating ? 'Creating...' : 'Create List'}
        </button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
