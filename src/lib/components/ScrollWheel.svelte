<script lang="ts">
  import { onMount } from 'svelte';

  let {
    items,
    values,
    value = $bindable(),
  }: {
    items: string[];
    values: number[];
    value: number;
  } = $props();

  const ITEM_HEIGHT = 36;
  const VISIBLE = 3; // items visible above/below center

  let container: HTMLDivElement;
  let isScrolling = false;
  let scrollTimeout: ReturnType<typeof setTimeout>;

  function indexOfValue(v: number): number {
    const idx = values.indexOf(v);
    return idx >= 0 ? idx : 0;
  }

  function scrollToIndex(index: number, behavior: ScrollBehavior = 'instant') {
    if (!container) return;
    container.scrollTo({ top: index * ITEM_HEIGHT, behavior });
  }

  onMount(() => {
    scrollToIndex(indexOfValue(value));
  });

  $effect(() => {
    // When value changes externally, sync scroll position
    if (!isScrolling) {
      scrollToIndex(indexOfValue(value));
    }
  });

  function handleScroll() {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      const idx = Math.round(container.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, values.length - 1));
      if (values[clamped] !== value) {
        value = values[clamped];
      }
    }, 100);
  }

  function handleClick(idx: number) {
    value = values[idx];
    scrollToIndex(idx, 'smooth');
  }
</script>

<div class="relative" style="height: {ITEM_HEIGHT * (VISIBLE * 2 + 1)}px;">
  <!-- Highlight bar for selected item -->
  <div
    class="pointer-events-none absolute inset-x-0 rounded-md bg-surface-subtle"
    style="top: {ITEM_HEIGHT * VISIBLE}px; height: {ITEM_HEIGHT}px;"
  ></div>

  <div
    bind:this={container}
    class="h-full overflow-y-scroll scroll-smooth"
    style="scroll-snap-type: y mandatory; scrollbar-width: none; -ms-overflow-style: none;"
    onscroll={handleScroll}
  >
    <!-- Padding so first/last items can center -->
    <div style="height: {ITEM_HEIGHT * VISIBLE}px;"></div>

    {#each items as item, i (i)}
      <button
        type="button"
        class="flex w-full items-center justify-center text-sm font-mono transition-all"
        style="height: {ITEM_HEIGHT}px; scroll-snap-align: center;"
        class:font-medium={values[i] === value}
        class:text-foreground={values[i] === value}
        class:text-foreground-muted={values[i] !== value}
        class:opacity-40={Math.abs(i - indexOfValue(value)) > 2}
        onclick={() => handleClick(i)}
      >
        {item}
      </button>
    {/each}

    <div style="height: {ITEM_HEIGHT * VISIBLE}px;"></div>
  </div>
</div>

<style>
  div::-webkit-scrollbar {
    display: none;
  }
</style>
