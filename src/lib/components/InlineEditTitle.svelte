<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';

  let {
    taskId,
    value,
    disabled = false,
  }: {
    taskId: string;
    value: string;
    disabled?: boolean;
  } = $props();

  let editing = $state(false);
  let editValue = $state(value);
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    editValue = value;
  });

  function startEdit() {
    if (disabled) return;
    editing = true;
    editValue = value;
    // Focus after Svelte renders the input
    requestAnimationFrame(() => inputEl?.focus());
  }

  async function save() {
    editing = false;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === value) {
      editValue = value;
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        toast.error('Failed to update title');
        editValue = value;
      } else {
        await invalidateAll();
      }
    } catch {
      toast.error('Failed to update title');
      editValue = value;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      editing = false;
      editValue = value;
    }
  }
</script>

{#if editing}
  <input
    bind:this={inputEl}
    type="text"
    bind:value={editValue}
    onblur={save}
    onkeydown={handleKeydown}
    class="bg-transparent border-b border-primary outline-none text-inherit w-full py-0"
  />
{:else}
  <button
    type="button"
    class="text-left truncate hover:underline hover:decoration-foreground-muted/40 decoration-1 underline-offset-2 cursor-text"
    onclick={startEdit}
    {disabled}
  >
    {value}
  </button>
{/if}
