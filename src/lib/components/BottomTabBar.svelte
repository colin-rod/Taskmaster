<script lang="ts">
  import { page } from '$app/stores';
  import { Inbox, CalendarDays, Plus, Search, Menu } from '@lucide/svelte';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import QuickAdd from '$lib/components/QuickAdd.svelte';

  let addSheetOpen = $state(false);

  function isActive(href: string, pathname: string): boolean {
    return pathname.startsWith(href);
  }

  const moreRoutes = ['/more', '/calendar', '/lists', '/overdue', '/upcoming', '/assigned', '/completed', '/settings'];

  function isMoreActive(pathname: string): boolean {
    return moreRoutes.some((r) => pathname.startsWith(r));
  }
</script>

<div class="fixed bottom-0 inset-x-0 z-50 border-t bg-surface md:hidden pb-safe">
  <nav class="flex items-center justify-around h-14 px-2">
    <!-- Inbox tab -->
    <a
      href="/inbox"
      class="flex flex-col items-center gap-0.5 px-2 py-2 min-h-11 justify-center
        {isActive('/inbox', $page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <Inbox class="w-5 h-5" />
      <span class="text-[10px] font-medium">Inbox</span>
    </a>

    <!-- Today tab -->
    <a
      href="/today"
      class="flex flex-col items-center gap-0.5 px-2 py-2 min-h-11 justify-center
        {isActive('/today', $page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <CalendarDays class="w-5 h-5" />
      <span class="text-[10px] font-medium">Today</span>
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

    <!-- Search tab -->
    <a
      href="/search"
      class="flex flex-col items-center gap-0.5 px-2 py-2 min-h-11 justify-center
        {isActive('/search', $page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <Search class="w-5 h-5" />
      <span class="text-[10px] font-medium">Search</span>
    </a>

    <!-- More tab -->
    <a
      href="/more"
      class="flex flex-col items-center gap-0.5 px-2 py-2 min-h-11 justify-center
        {isMoreActive($page.url.pathname) ? 'text-primary' : 'text-foreground-secondary'}"
    >
      <Menu class="w-5 h-5" />
      <span class="text-[10px] font-medium">More</span>
    </a>
  </nav>
</div>

<Sheet.Root bind:open={addSheetOpen}>
  <Sheet.Content side="bottom" class="rounded-t-lg px-4 pb-8 pt-4">
    <Sheet.Header>
      <Sheet.Title>Quick Add Task</Sheet.Title>
    </Sheet.Header>
    <div class="mt-2">
      <QuickAdd />
    </div>
  </Sheet.Content>
</Sheet.Root>
