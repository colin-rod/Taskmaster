import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.profileId) {
    redirect(303, '/pick-profile');
  }

  const { count } = await locals.supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', locals.profileId)
    .eq('is_read', false);

  return { profileId: locals.profileId, unreadCount: count ?? 0 };
};
