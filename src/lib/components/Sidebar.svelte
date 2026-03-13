<script lang="ts">
  import { page } from '$app/stores';
  import { sidebarCollapsed } from '$lib/stores/sidebar.js';
  import {
    CalendarDays,
    CalendarRange,
    Inbox,
    UserCheck,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Search,
  } from '@lucide/svelte';
  import { getListIcon } from '$lib/utils/icons.js';
  import SearchBar from '$lib/components/SearchBar.svelte';

  let {
    filterCounts,
    lists,
    onCreateList,
    onSelectTask,
  }: {
    filterCounts: { today: number; upcoming: number; inbox: number; assigned: number };
    lists: { id: string; name: string; color: string | null; icon: string; taskCount: number }[];
    onCreateList: () => void;
    onSelectTask: (taskId: string) => void;
  } = $props();

  const smartFilters = [
    { label: 'Today', href: '/today', icon: CalendarDays, countKey: 'today' as const },
    { label: 'Upcoming', href: '/upcoming', icon: CalendarRange, countKey: 'upcoming' as const },
    { label: 'Inbox', href: '/inbox', icon: Inbox, countKey: 'inbox' as const },
    { label: 'Assigned', href: '/assigned', icon: UserCheck, countKey: 'assigned' as const },
  ];

  let searchOpen = $state(false);

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function openSearch() {
    if ($sidebarCollapsed) {
      sidebarCollapsed.set(false);
    }
    searchOpen = true;
  }
</script>

<aside
  class="flex flex-col h-full border-r bg-surface transition-[width] duration-200 overflow-hidden
    {$sidebarCollapsed ? 'w-14' : 'w-60'}"
>
  <!-- Collapse toggle + Search -->
  <div class="flex items-center {$sidebarCollapsed ? 'flex-col gap-1 justify-start pt-3 pb-1' : 'justify-between px-2 pt-3 pb-1'}">
    {#if $sidebarCollapsed}
      <button
        type="button"
        class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
        onclick={() => sidebarCollapsed.update((v) => !v)}
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
        onclick={openSearch}
        aria-label="Search tasks"
      >
        <Search class="w-4 h-4" />
      </button>
    {:else}
      <button
        type="button"
        class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
        onclick={openSearch}
        aria-label="Search tasks"
      >
        <Search class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
        onclick={() => sidebarCollapsed.update((v) => !v)}
        aria-label="Collapse sidebar"
      >
        <PanelLeftClose class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <!-- Search bar -->
  {#if searchOpen && !$sidebarCollapsed}
    <SearchBar {onSelectTask} onClose={() => { searchOpen = false; }} />
  {/if}

  <!-- Smart Filters -->
  <nav class="px-2 space-y-0.5">
    {#if !$sidebarCollapsed}
      <div class="section-header px-2 mt-2">Filters</div>
    {/if}
    {#each smartFilters as filter}
      {@const active = isActive(filter.href, $page.url.pathname)}
      {@const count = filterCounts[filter.countKey]}
      <a
        href={filter.href}
        class="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
          {active ? 'bg-primary-tint text-foreground font-medium' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}
          {$sidebarCollapsed ? 'justify-center' : ''}"
        title={$sidebarCollapsed ? filter.label : undefined}
      >
        <filter.icon class="w-4 h-4 flex-shrink-0 {active ? 'text-primary' : ''}" />
        {#if !$sidebarCollapsed}
          <span class="flex-1 truncate">{filter.label}</span>
          {#if count > 0}
            <span class="text-xs text-foreground-muted tabular-nums">{count}</span>
          {/if}
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Divider -->
  <div class="mx-3 my-3 border-t border-border-divider"></div>

  <!-- Lists -->
  <nav class="px-2 space-y-0.5 flex-1 overflow-y-auto">
    {#if !$sidebarCollapsed}
      <div class="section-header px-2">Lists</div>
    {/if}
    {#each lists as list (list.id)}
      {@const active = $page.url.pathname === `/lists/${list.id}`}
      <a
        href="/lists/{list.id}"
        class="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
          {active ? 'bg-primary-tint text-foreground font-medium' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}
          {$sidebarCollapsed ? 'justify-center' : ''}"
        title={$sidebarCollapsed ? list.name : undefined}
      >
        {@const ListIcon = getListIcon(list.icon)}
        <div
          class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
        >
          <ListIcon class="w-3 h-3 text-white" />
        </div>
        {#if !$sidebarCollapsed}
          <span class="flex-1 truncate">{list.name}</span>
          {#if list.taskCount > 0}
            <span class="text-xs text-foreground-muted tabular-nums">{list.taskCount}</span>
          {/if}
        {/if}
      </a>
    {/each}

    <!-- New List button -->
    <button
      type="button"
      class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors
        {$sidebarCollapsed ? 'justify-center' : ''}"
      onclick={onCreateList}
      title={$sidebarCollapsed ? 'New list' : undefined}
    >
      <Plus class="w-4 h-4 flex-shrink-0" />
      {#if !$sidebarCollapsed}
        <span>New list</span>
      {/if}
    </button>
  </nav>
</aside>
