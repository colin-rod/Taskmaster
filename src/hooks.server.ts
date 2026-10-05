import type { Handle } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { isUuid } from '$lib/server/task-visibility';
import { resolveTimeZone } from '$lib/utils/dates';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = getSupabaseAdmin();
  // The profile id is interpolated into PostgREST filters (task-visibility.ts),
  // so a cookie that isn't a UUID is treated as no profile at all.
  const profileId = event.cookies.get('profile_id');
  event.locals.profileId = isUuid(profileId) ? profileId : null;
  // "Today" is the user's local date. The browser reports its time zone in the
  // `tz` cookie (set in the protected layout); until it has, fall back to UTC.
  event.locals.timeZone = resolveTimeZone(event.cookies.get('tz'));

  return resolve(event);
};
