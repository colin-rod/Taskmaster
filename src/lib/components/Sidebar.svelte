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
  } from '@lucide/svelte';
  import { getListIcon } from '$lib/utils/icons.js';

  let {
    filterCounts,
    lists,
    onCreateList,
  }: {
    filterCounts: { today: number; upcoming: number; inbox: number; assigned: number };
    lists: { id: string; name: string; color: string | null; icon: string; taskCount: number; isShared: boolean }[];
    onCreateList: () => void;
  } = $props();

  const inboxFilter = { label: 'Inbox', href: '/inbox', icon: Inbox, countKey: 'inbox' as const };

  const smartFilters = [
    { label: 'Today', href: '/today', icon: CalendarDays, countKey: 'today' as const },
    { label: 'Upcoming', href: '/upcoming', icon: CalendarRange, countKey: 'upcoming' as const },
    { label: 'Assigned', href: '/assigned', icon: UserCheck, countKey: 'assigned' as const },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const privateLists = $derived(lists.filter((l) => !l.isShared));
  const sharedLists = $derived(lists.filter((l) => l.isShared));

</script>

<aside
  class="flex flex-col h-full border-r bg-surface transition-[width] duration-200 overflow-hidden
    {$sidebarCollapsed ? 'w-14' : 'w-60'}"
>
  <!-- Collapse toggle -->
  <div class="flex items-center justify-end px-2 pt-3 pb-1">
    <button
      type="button"
      class="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-subtle transition-colors"
      onclick={() => sidebarCollapsed.update((v) => !v)}
      aria-label={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {#if $sidebarCollapsed}
        <PanelLeftOpen class="w-4 h-4" />
      {:else}
        <PanelLeftClose class="w-4 h-4" />
      {/if}
    </button>
  </div>

  <!-- Inbox -->
  <nav class="px-2 mt-1">
    {@const inboxActive = isActive(inboxFilter.href, $page.url.pathname)}
    {@const inboxCount = filterCounts[inboxFilter.countKey]}
    <a
      href={inboxFilter.href}
      class="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors
        {inboxActive ? 'bg-primary-tint text-foreground' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}
        {$sidebarCollapsed ? 'justify-center' : ''}"
      title={$sidebarCollapsed ? inboxFilter.label : undefined}
    >
      <inboxFilter.icon class="w-4 h-4 flex-shrink-0 {inboxActive ? 'text-primary' : ''}" />
      {#if !$sidebarCollapsed}
        <span class="flex-1 truncate">{inboxFilter.label}</span>
        {#if inboxCount > 0}
          <span class="text-xs text-foreground-muted tabular-nums">{inboxCount}</span>
        {/if}
      {/if}
    </a>
  </nav>

  <!-- Divider -->
  <div class="mx-3 my-2 border-t border-border-divider"></div>

  <!-- Smart Filters -->
  <nav class="px-2 space-y-0.5">
    {#if !$sidebarCollapsed}
      <div class="section-header px-2 mt-1">Filters</div>
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
    {#if $sidebarCollapsed}
      {#each lists as list (list.id)}
        {@const active = $page.url.pathname === `/lists/${list.id}`}
        {@const ListIcon = getListIcon(list.icon)}
        <a
          href="/lists/{list.id}"
          class="flex items-center justify-center px-2 py-1.5 rounded-md text-sm transition-colors
            {active ? 'bg-primary-tint text-foreground font-medium' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}"
          title={list.name}
        >
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
          >
            <ListIcon class="w-3 h-3 text-white" />
          </div>
        </a>
      {/each}
    {:else}
      {#if privateLists.length > 0}
        <div class="section-header px-2">Private</div>
        {#each privateLists as list (list.id)}
          {@const active = $page.url.pathname === `/lists/${list.id}`}
          {@const ListIcon = getListIcon(list.icon)}
          <a
            href="/lists/{list.id}"
            class="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
              {active ? 'bg-primary-tint text-foreground font-medium' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}"
          >
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
            >
              <ListIcon class="w-3 h-3 text-white" />
            </div>
            <span class="flex-1 truncate">{list.name}</span>
            {#if list.taskCount > 0}
              <span class="text-xs text-foreground-muted tabular-nums">{list.taskCount}</span>
            {/if}
          </a>
        {/each}
      {/if}

      {#if sharedLists.length > 0}
        <div class="section-header px-2 {privateLists.length > 0 ? 'mt-2' : ''}">Shared</div>
        {#each sharedLists as list (list.id)}
          {@const active = $page.url.pathname === `/lists/${list.id}`}
          {@const ListIcon = getListIcon(list.icon)}
          <a
            href="/lists/{list.id}"
            class="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
              {active ? 'bg-primary-tint text-foreground font-medium' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-subtle'}"
          >
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
            >
              <ListIcon class="w-3 h-3 text-white" />
            </div>
            <span class="flex-1 truncate">{list.name}</span>
            {#if list.taskCount > 0}
              <span class="text-xs text-foreground-muted tabular-nums">{list.taskCount}</span>
            {/if}
          </a>
        {/each}
      {/if}

      {#if privateLists.length === 0 && sharedLists.length === 0}
        <div class="section-header px-2">Lists</div>
      {/if}
    {/if}

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
