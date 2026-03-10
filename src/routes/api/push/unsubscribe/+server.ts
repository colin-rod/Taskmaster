import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await request.json();

  if (!endpoint) {
    return json({ error: 'Endpoint is required' }, { status: 400 });
  }

  await locals.supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', locals.session.user.id)
    .eq('endpoint', endpoint);

  return json({ ok: true });
};
