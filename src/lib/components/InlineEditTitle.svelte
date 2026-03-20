<script lang="ts">
  import { patchTask } from '$lib/utils/api.js';

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
  // svelte-ignore state_referenced_locally
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

    const ok = await patchTask(taskId, { title: trimmed }, 'Failed to update title');
    if (!ok) editValue = value;
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
    class="text-left truncate hover:underline hover:decoration-foreground-muted/40 decoration-1 underline-offset-2 cursor-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
    aria-label="Edit title: {value}"
    title={value}
    onclick={startEdit}
    {disabled}
  >
    {value}
  </button>
{/if}
