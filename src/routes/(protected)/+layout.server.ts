import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

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

  const [
    { count: unreadCount },
    { data: lists },
    { count: todayCount },
    { count: overdueCount },
    { count: upcomingCount },
    { count: inboxCount },
    { count: assignedCount },
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

    // User's lists
    locals.supabase
      .from('task_lists')
      .select('id, name, color, icon, owner_id, sort_order, task_list_members(count)')
      .order('sort_order', { ascending: true }),

    // Today count (due today, not done/canceled)
    locals.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gte('due_at', startOfToday.toISOString())
      .lte('due_at', endOfToday.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Overdue count
    locals.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .lt('due_at', startOfToday.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Upcoming count (next 7 days, excluding today)
    locals.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gt('due_at', endOfToday.toISOString())
      .lte('due_at', endOfWeek.toISOString())
      .not('status', 'in', '(done,canceled)'),

    // Inbox count (no list)
    locals.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .is('list_id', null)
      .not('status', 'in', '(done,canceled)'),

    // Assigned to me count
    locals.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to_user_id', locals.profileId)
      .not('status', 'in', '(done,canceled)'),

    // Task counts per list via aggregate RPC
    locals.supabase.rpc('get_list_task_counts'),

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
    lists: (lists ?? []).map((l) => ({
      ...l,
      taskCount: countMap[l.id] ?? 0,
      isShared: ((l.task_list_members as { count: number }[] | null)?.[0]?.count ?? 1) > 1,
    })),
    filterCounts: {
      today: (todayCount ?? 0) + (overdueCount ?? 0),
      upcoming: upcomingCount ?? 0,
      inbox: inboxCount ?? 0,
      assigned: assignedCount ?? 0,
    },
  };
};
