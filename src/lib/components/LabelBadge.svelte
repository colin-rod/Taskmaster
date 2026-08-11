<script lang="ts">
  import type { Label } from '$lib/types/index.js';

  let {
    label,
    size = 'sm',
    onremove,
  }: {
    label: Label;
    size?: 'sm' | 'md';
    onremove?: () => void;
  } = $props();
</script>

<span
  class="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap {size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}"
  style="background: {label.color}1A; color: {label.color};"
>
  {label.name}
  {#if onremove}
    <button
      type="button"
      class="hover:opacity-70 transition-opacity leading-none"
      onclick={onremove}
    >
      &times;
    </button>
  {/if}
</span>
