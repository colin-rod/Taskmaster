import type { Handle } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = getSupabaseAdmin();
  event.locals.profileId = event.cookies.get('profile_id') ?? null;

  return resolve(event);
};
