<script lang="ts">
  import { page } from '$app/stores';
  import { Home, List, Plus } from '@lucide/svelte';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import QuickAdd from '$lib/components/QuickAdd.svelte';

  let addSheetOpen = $state(false);

  function isActive(href: string, pathname: string): boolean {
    return pathname.startsWith(href);
  }
</script>

<div class="fixed bottom-0 inset-x-0 z-50 border-t bg-surface md:hidden">
  <nav class="flex items-center justify-around h-14 px-4">
    <!-- Home tab -->
    <a
      href="/today"
      class="flex flex-col items-center gap-0.5 px-3 py-1
        {isActive('/today', $page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <Home class="w-5 h-5" />
      <span class="text-[10px] font-medium">Home</span>
    </a>

    <!-- Add button (center, prominent) -->
    <button
      type="button"
      class="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-primary text-primary-foreground shadow-level-2"
      onclick={() => { addSheetOpen = true; }}
      aria-label="Add task"
    >
      <Plus class="w-6 h-6" />
    </button>

    <!-- Lists tab -->
    <a
      href="/lists"
      class="flex flex-col items-center gap-0.5 px-3 py-1
        {isActive('/lists', $page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <List class="w-5 h-5" />
      <span class="text-[10px] font-medium">Lists</span>
    </a>
  </nav>
</div>

<Sheet.Root bind:open={addSheetOpen}>
  <Sheet.Content side="bottom" class="rounded-t-lg px-4 pb-8 pt-6">
    <Sheet.Header>
      <Sheet.Title>Quick Add Task</Sheet.Title>
    </Sheet.Header>
    <div class="mt-4">
      <QuickAdd />
    </div>
  </Sheet.Content>
</Sheet.Root>
