import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { visibleTo } from '$lib/server/task-visibility.js';

export const GET: RequestHandler = async ({ url, locals: { supabase, profileId } }) => {
  if (!profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = url.searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return json({ tasks: [] });
  }

  const { data: tasks } = await visibleTo(
    supabase
      .from('tasks')
      .select('id, title, status, due_at, owner_id, is_shared, list:task_lists(name, color), owner:profiles!owner_id(id, display_name, avatar_color)'),
    profileId
  )
    .ilike('title', `%${q}%`)
    .not('status', 'in', '(done,canceled)')
    .limit(10);

  return json({ tasks: tasks ?? [] });
};
