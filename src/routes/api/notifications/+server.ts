import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await locals.supabase
    .from('notifications')
    .select('*, task:tasks(title)')
    .eq('user_id', locals.session.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json(data);
};
