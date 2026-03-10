import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.session) {
    redirect(303, '/auth/login');
  }

  const { count } = await locals.supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', locals.session.user.id)
    .eq('is_read', false);

  return { session: locals.session, unreadCount: count ?? 0 };
};
