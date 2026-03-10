<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';

  let { action = '?/createTask' }: { action?: string } = $props();

  let title = $state('');
  let dueAt = $state('');
  let creating = $state(false);
  let showDatePicker = $state(false);
</script>

<form
  method="POST"
  {action}
  class="flex items-center gap-2"
  use:enhance={() => {
    creating = true;
    return async ({ result, update }) => {
      creating = false;
      if (result.type === 'success') {
        title = '';
        dueAt = '';
        showDatePicker = false;
        toast.success('Task added');
      }
      await update();
    };
  }}
>
  <input
    name="title"
    type="text"
    bind:value={title}
    placeholder="Add a task..."
    required
    class="select-input flex-1"
    disabled={creating}
  />
  {#if showDatePicker}
    <input
      name="due_at"
      type="date"
      bind:value={dueAt}
      class="select-input w-auto text-sm"
    />
  {:else}
    <input type="hidden" name="due_at" value="" />
    <button
      type="button"
      class="rounded px-2 py-2 text-foreground-secondary hover:text-foreground hover:bg-surface-subtle text-sm"
      onclick={() => { showDatePicker = true; }}
      aria-label="Set due date"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="3" width="12" height="11" rx="1.5" />
        <path d="M2 6h12M5 1v3M11 1v3" />
      </svg>
    </button>
  {/if}
  <button
    type="submit"
    class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
    disabled={creating || !title.trim()}
  >
    Add
  </button>
</form>
