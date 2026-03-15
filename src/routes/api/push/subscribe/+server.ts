import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint, keys } = await request.json();

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return json({ error: 'Invalid subscription data' }, { status: 400 });
  }

  const { error } = await locals.supabase.from('push_subscriptions').upsert(
    {
      user_id: locals.profileId,
      endpoint,
      keys_p256dh: keys.p256dh,
      keys_auth: keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ ok: true }, { status: 201 });
};
