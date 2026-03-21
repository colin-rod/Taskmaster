<script lang="ts">
  import { page } from '$app/stores';
  import { sidebarCollapsed } from '$lib/stores/sidebar.js';
  import {
    AlertCircle,
    CalendarDays,
    CalendarRange,
    CheckCheck,
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
    filterCounts: { today: number; overdue: number; upcoming: number; inbox: number; assigned: number; completed: number };
    lists: { id: string; name: string; color: string | null; icon: string; taskCount: number; isShared: boolean }[];
    onCreateList: () => void;
  } = $props();

  const inboxFilter = { label: 'Inbox', href: '/inbox', icon: Inbox, countKey: 'inbox' as const };

  const smartFilters = [
    { label: 'Overdue', href: '/overdue', icon: AlertCircle, countKey: 'overdue' as const },
    { label: 'Today', href: '/today', icon: CalendarDays, countKey: 'today' as const },
    { label: 'Upcoming', href: '/upcoming', icon: CalendarRange, countKey: 'upcoming' as const },
    { label: 'Assigned to Me', href: '/assigned', icon: UserCheck, countKey: 'assigned' as const },
    { label: 'Completed', href: '/completed', icon: CheckCheck, countKey: 'completed' as const },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const privateLists = $derived(lists.filter((l) => !l.isShared));
  const sharedLists = $derived(lists.filter((l) => l.isShared));

</script>

<aside
  class="flex flex-col h-full border-r transition-[width] duration-200 overflow-hidden
    {$sidebarCollapsed ? 'w-14' : 'w-60'}"
  style="background-color: hsl(var(--sidebar-bg))"
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
    <a
      href={inboxFilter.href}
      class="relative flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors
        {isActive(inboxFilter.href, $page.url.pathname) ? 'bg-primary-tint text-foreground font-semibold' : 'text-foreground-secondary hover:text-foreground hover:bg-primary/8'}
        {$sidebarCollapsed ? 'justify-center' : ''}"
      title={$sidebarCollapsed ? inboxFilter.label : undefined}
    >
      {#if isActive(inboxFilter.href, $page.url.pathname)}
        <span class="sidebar-active-bar"></span>
      {/if}
      <inboxFilter.icon class="w-4 h-4 flex-shrink-0 {isActive(inboxFilter.href, $page.url.pathname) ? 'text-primary' : ''}" />
      {#if !$sidebarCollapsed}
        <span class="flex-1 truncate">{inboxFilter.label}</span>
        {#if filterCounts[inboxFilter.countKey] > 0}
          <span class="text-xs font-semibold bg-background px-1.5 py-0.5 rounded text-foreground-secondary tabular-nums">{filterCounts[inboxFilter.countKey]}</span>
        {/if}
      {/if}
    </a>
  </nav>

  <!-- Divider -->
  <div class="mx-3 my-2 border-t border-border-divider"></div>

  <!-- Smart Filters -->
  <nav class="px-2 space-y-0.5">
    {#if !$sidebarCollapsed}
      <h3 class="section-header px-2 mt-3 mb-1.5">Views</h3>
    {/if}
    {#each smartFilters as filter}
      {@const active = isActive(filter.href, $page.url.pathname)}
      {@const count = filterCounts[filter.countKey]}
      {@const isOverdue = filter.countKey === 'overdue'}
      {#if !isOverdue || count > 0 || active}
        <a
          href={filter.href}
          class="relative flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
            {active ? 'bg-primary-tint text-foreground font-semibold' : 'text-foreground-secondary hover:text-foreground hover:bg-primary/8'}
            {$sidebarCollapsed ? 'justify-center' : ''}"
          title={$sidebarCollapsed ? filter.label : undefined}
          aria-label={$sidebarCollapsed ? filter.label : undefined}
        >
          {#if active}
            <span class="sidebar-active-bar"></span>
          {/if}
          <filter.icon class="w-4 h-4 flex-shrink-0 {active ? 'text-primary'
            : filter.countKey === 'overdue' && count > 0 ? 'text-destructive'
            : filter.countKey === 'today'    ? 'text-status-blocked-strong'
            : filter.countKey === 'upcoming' ? 'text-status-doing'
            : filter.countKey === 'assigned' ? 'text-accent'
            : ''}" />
          {#if !$sidebarCollapsed}
            <span class="flex-1 truncate">{filter.label}</span>
            {#if count > 0}
              <span class="text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums
                {isOverdue ? 'bg-destructive/10 text-destructive'
                : filter.countKey === 'today' ? 'bg-primary-tint text-primary'
                : 'bg-background text-foreground-secondary'}">{count}</span>
            {/if}
          {/if}
        </a>
      {/if}
    {/each}
  </nav>

  <!-- Divider -->
  <div class="mx-3 my-3 border-t border-border-divider"></div>

  <!-- Lists -->
  <nav class="px-2 space-y-0.5 flex-1 overflow-y-auto pb-4">
    {#if $sidebarCollapsed}
      {#each lists as list (list.id)}
        {@const active = $page.url.pathname === `/lists/${list.id}`}
        {@const ListIcon = getListIcon(list.icon)}
        <a
          href="/lists/{list.id}"
          class="relative flex items-center justify-center px-2 py-1.5 rounded-md text-sm transition-colors
            {active ? 'bg-primary-tint text-foreground font-semibold' : 'text-foreground-secondary hover:text-foreground hover:bg-primary/8'}"
          title={list.name}
          aria-label={list.name}
        >
          {#if active}
            <span class="sidebar-active-bar"></span>
          {/if}
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
          >
            <ListIcon class="w-3 h-3 text-white drop-shadow-sm" />
          </div>
        </a>
      {/each}
    {:else}
      {#if privateLists.length > 0}
        <h3 class="section-header px-2 mb-2">Private</h3>
        {#each privateLists as list (list.id)}
          {@const active = $page.url.pathname === `/lists/${list.id}`}
          {@const ListIcon = getListIcon(list.icon)}
          <a
            href="/lists/{list.id}"
            class="relative flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
              {active ? 'bg-primary-tint text-foreground font-semibold' : 'text-foreground-secondary hover:text-foreground hover:bg-primary/8'}"
          >
            {#if active}
              <span class="sidebar-active-bar"></span>
            {/if}
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
            >
              <ListIcon class="w-3 h-3 text-white drop-shadow-sm" />
            </div>
            <span class="flex-1 truncate">{list.name}</span>
            {#if list.taskCount > 0}
              <span class="text-xs font-semibold bg-background px-1.5 py-0.5 rounded text-foreground-secondary tabular-nums">{list.taskCount}</span>
            {/if}
          </a>
        {/each}
      {/if}

      {#if sharedLists.length > 0}
        <h3 class="section-header px-2 mb-2 {privateLists.length > 0 ? 'mt-4' : ''}">Shared</h3>
        {#each sharedLists as list (list.id)}
          {@const active = $page.url.pathname === `/lists/${list.id}`}
          {@const ListIcon = getListIcon(list.icon)}
          <a
            href="/lists/{list.id}"
            class="relative flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors
              {active ? 'bg-primary-tint text-foreground font-semibold' : 'text-foreground-secondary hover:text-foreground hover:bg-primary/8'}"
          >
            {#if active}
              <span class="sidebar-active-bar"></span>
            {/if}
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style="background-color: {list.color || 'hsl(var(--foreground-muted))'}"
            >
              <ListIcon class="w-3 h-3 text-white drop-shadow-sm" />
            </div>
            <span class="flex-1 truncate">{list.name}</span>
            {#if list.taskCount > 0}
              <span class="text-xs font-semibold bg-background px-1.5 py-0.5 rounded text-foreground-secondary tabular-nums">{list.taskCount}</span>
            {/if}
          </a>
        {/each}
      {/if}

      {#if privateLists.length === 0 && sharedLists.length === 0}
        <h3 class="section-header px-2 mb-2">Lists</h3>
      {/if}
    {/if}

    <!-- New List button -->
    <button
      type="button"
      class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-foreground-secondary hover:text-primary transition-colors
        {$sidebarCollapsed ? 'justify-center' : 'border border-dashed border-primary/30 hover:border-primary/60'}"
      onclick={onCreateList}
      title={$sidebarCollapsed ? 'New list' : undefined}
      aria-label={$sidebarCollapsed ? 'New list' : undefined}
    >
      <Plus class="w-4 h-4 flex-shrink-0" />
      {#if !$sidebarCollapsed}
        <span>New list</span>
      {/if}
    </button>
  </nav>
</aside>
