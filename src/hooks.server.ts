import type { Handle } from '@sveltejs/kit';

import { createSupabaseServerClient } from '$lib/supabase.server';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);

  const {
    data: { user },
  } = await event.locals.supabase.auth.getUser();

  if (user) {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    event.locals.session = session;
  } else {
    event.locals.session = null;
  }

  return resolve(event);
};
