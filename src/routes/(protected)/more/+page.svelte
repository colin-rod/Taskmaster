<script lang="ts">
  import type { PageData } from './$types';
  import {
    Calendar,
    List,
    AlertCircle,
    CalendarRange,
    UserCheck,
    CheckCheck,
    Settings,
    ChevronRight,
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const menuItems = [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Lists', href: '/lists', icon: List },
    { label: 'Overdue', href: '/overdue', icon: AlertCircle, countKey: 'overdue' as const },
    { label: 'Upcoming', href: '/upcoming', icon: CalendarRange, countKey: 'upcoming' as const },
    { label: 'Assigned to Me', href: '/assigned', icon: UserCheck, countKey: 'assigned' as const },
    { label: 'Completed', href: '/completed', icon: CheckCheck, countKey: 'completed' as const },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];
</script>

<div class="max-w-lg mx-auto">
  <h1 class="text-page-title font-accent mb-6" style="font-optical-sizing: auto;">More</h1>

  <nav class="space-y-0.5">
    {#each menuItems as item}
      <a
        href={item.href}
        class="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
      >
        <item.icon class="w-5 h-5 text-foreground-secondary flex-shrink-0" />
        <span class="flex-1 text-sm font-medium">{item.label}</span>
        {#if item.countKey && data.filterCounts[item.countKey] > 0}
          <span class="text-xs font-semibold bg-surface-subtle px-1.5 py-0.5 rounded tabular-nums text-foreground-secondary">
            {data.filterCounts[item.countKey]}
          </span>
        {/if}
        <ChevronRight class="w-4 h-4 text-foreground-muted flex-shrink-0" />
      </a>
    {/each}
  </nav>
</div>
