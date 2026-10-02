import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
import { visibleTo } from '$lib/server/task-visibility.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.profileId) {
    redirect(303, '/pick-profile');
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const profileId = locals.profileId;

  // Count queries only ever cover tasks this profile can see.
  const visibleTasks = () =>
    visibleTo(locals.supabase.from('tasks').select('*', { count: 'exact', head: true }), profileId);

  const [
    { count: unreadCount },
    { data: lists, error: listsError },
    { count: todayCount },
    { count: overdueCount },
    { count: upcomingCount },
    { count: inboxCount },
    { count: assignedCount },
    { count: completedCount },
    { data: listTaskCounts },
    { data: profileData },
    { data: memberships },
  ] = await Promise.all([
    // Unread notifications
    locals.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', locals.profileId)
      .eq('is_read', false),

    // Lists (exclude archived); narrowed to this profile's memberships below
    locals.supabase
      .from('task_lists')
      .select('id, name, color, icon, owner_id, sort_order, task_list_members(count)')
      .is('archived_at', null)
      .order('sort_order', { ascending: true }),

    // Today count (due today, not done/canceled)
    visibleTasks()
      .gte('due_at', startOfToday.toISOString())
      .lte('due_at', endOfToday.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Overdue count
    visibleTasks()
      .lt('due_at', startOfToday.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Upcoming count (next 7 days, excluding today)
    visibleTasks()
      .gt('due_at', endOfToday.toISOString())
      .lte('due_at', endOfWeek.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Inbox count (no list)
    visibleTasks()
      .is('list_id', null)
      .not('status', 'in', '(done,canceled)'),

    // Assigned to me count
    visibleTasks()
      .eq('assigned_to_user_id', locals.profileId)
      .not('status', 'in', '(done,canceled)'),

    // Completed count (all done/canceled tasks)
    visibleTasks()
      .in('status', ['done', 'canceled']),

    // Task counts per list via aggregate RPC
    locals.supabase.rpc('get_list_task_counts', { p_profile_id: profileId }),

    // Current profile data
    locals.supabase
      .from('profiles')
      .select('id, display_name, email, avatar_color, avatar_url')
      .eq('id', locals.profileId)
      .single(),

    // Current user's role in all their lists
    locals.supabase
      .from('task_list_members')
      .select('list_id, role')
      .eq('user_id', locals.profileId),
  ]);

  if (listsError) console.error('[layout] Sidebar list query failed:', listsError.message);

  // Build list count map from RPC aggregate rows
  const countMap: Record<string, number> = {};
  if (listTaskCounts) {
    for (const row of listTaskCounts) {
      countMap[row.list_id] = Number(row.count);
    }
  }

  const roleMap = Object.fromEntries((memberships ?? []).map((m) => [m.list_id, m.role]));

  return {
    profileId: locals.profileId,
    profile: profileData ?? null,
    unreadCount: unreadCount ?? 0,
    roleMap,
    // Lists are membership-scoped: only the ones this profile belongs to.
    lists: (lists ?? []).filter((l) => l.id in roleMap).map((l) => ({
      ...l,
      taskCount: countMap[l.id] ?? 0,
      isShared: ((l.task_list_members as { count: number }[] | null)?.[0]?.count ?? 1) > 1,
    })),
    filterCounts: {
      today: (todayCount ?? 0) + (overdueCount ?? 0),
      overdue: overdueCount ?? 0,
      upcoming: upcomingCount ?? 0,
      inbox: inboxCount ?? 0,
      assigned: assignedCount ?? 0,
      completed: completedCount ?? 0,
    },
  };
};
