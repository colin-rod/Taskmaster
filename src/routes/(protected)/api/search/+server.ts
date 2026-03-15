import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const q = url.searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return json({ tasks: [] });
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_at, list:task_lists(name, color)')
    .ilike('title', `%${q}%`)
    .not('status', 'in', '(done,canceled)')
    .limit(10);

  return json({ tasks: tasks ?? [] });
};
