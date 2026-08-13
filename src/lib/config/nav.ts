/**
 * Shared navigation item definitions.
 *
 * Single source of truth for the app's smart views so the desktop Sidebar and
 * the mobile "More" page (and any future nav surface) stay in sync — adding or
 * reordering a view is a one-file change here.
 */
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  Inbox,
  UserCheck,
} from '@lucide/svelte';
import type { Component } from 'svelte';

export type FilterCountKey =
  | 'today'
  | 'overdue'
  | 'upcoming'
  | 'inbox'
  | 'assigned'
  | 'completed';

export type FilterCounts = Record<FilterCountKey, number>;

export interface NavItem {
  label: string;
  href: string;
  icon: Component;
  /** Key into filterCounts for the badge; omit for views without a count. */
  countKey?: FilterCountKey;
}

/** Inbox — the primary capture bucket, shown standalone above the views.
 *  Typed with a required countKey so consumers can index filterCounts directly. */
export const inboxNavItem: NavItem & { countKey: FilterCountKey } = {
  label: 'Inbox',
  href: '/inbox',
  icon: Inbox,
  countKey: 'inbox',
};

/** The smart views, in canonical order. Consumers compose their own full nav
 *  around this (e.g. Sidebar prepends Inbox; the More page adds Search/
 *  Settings). */
export const smartViewNavItems: NavItem[] = [
  { label: 'Overdue', href: '/overdue', icon: AlertCircle, countKey: 'overdue' },
  { label: 'Today', href: '/today', icon: CalendarDays, countKey: 'today' },
  { label: 'Upcoming', href: '/upcoming', icon: CalendarRange, countKey: 'upcoming' },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Assigned to Me', href: '/assigned', icon: UserCheck, countKey: 'assigned' },
  { label: 'Completed', href: '/completed', icon: CheckCheck, countKey: 'completed' },
];
