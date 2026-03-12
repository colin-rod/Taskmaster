import type { Handle } from '@sveltejs/kit';

import { createSupabaseServerClient } from '$lib/supabase.server';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient();
  event.locals.profileId = event.cookies.get('profile_id') ?? null;

  return resolve(event);
};
