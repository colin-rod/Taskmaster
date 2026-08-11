<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    subtitle,
    illustration,
    action,
  }: {
    title: string;
    subtitle: string;
    illustration?: Snippet;
    action?: Snippet;
  } = $props();
</script>

<div class="flex flex-col items-center text-center py-12 px-4">
  {#if illustration}
    <div class="mb-5 empty-state-float">
      {@render illustration()}
    </div>
  {/if}
  <p class="text-title text-foreground mb-1">{title}</p>
  <p class="text-body-sm text-foreground-secondary max-w-xs">{subtitle}</p>
  {#if action}
    <div class="mt-4">
      {@render action()}
    </div>
  {/if}
</div>
