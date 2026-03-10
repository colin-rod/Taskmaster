import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await locals.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', locals.session.user.id)
      .eq('is_read', false);
  } else if (body.id) {
    await locals.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', locals.session.user.id);
  } else {
    return json({ error: 'Provide id or all: true' }, { status: 400 });
  }

  return json({ ok: true });
};
