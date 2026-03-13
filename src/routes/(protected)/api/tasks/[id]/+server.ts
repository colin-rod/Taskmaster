import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase } }) => {
  const { data: task, error: err } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name, avatar_color), list:task_lists(id, name, color, owner_id, sort_order, created_at, updated_at)')
    .eq('id', params.id)
    .single();

  if (err || !task) {
    throw error(404, 'Task not found');
  }

  return json({ task });
};
