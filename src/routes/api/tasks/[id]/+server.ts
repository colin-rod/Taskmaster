import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: task, error: err } = await locals.supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name, avatar_color), list:task_lists(id, name, color, owner_id, sort_order, created_at, updated_at)')
    .eq('id', params.id)
    .single();

  if (err || !task) {
    return json({ error: 'Task not found' }, { status: 404 });
  }

  return json({ task });
};

const ALLOWED_FIELDS = new Set(['title', 'priority', 'due_at', 'assigned_to_user_id', 'status']);

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return json({ error: 'Task ID is required' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Filter to allowed fields only
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Validate specific fields
  if ('title' in updates && (typeof updates.title !== 'string' || !updates.title.trim())) {
    return json({ error: 'Title must be a non-empty string' }, { status: 400 });
  }

  if ('priority' in updates) {
    const p = Number(updates.priority);
    if (![1, 2, 3, 4].includes(p)) {
      return json({ error: 'Priority must be 1-4' }, { status: 400 });
    }
    updates.priority = p;
  }

  if ('status' in updates) {
    const validStatuses = ['todo', 'in_progress', 'done', 'canceled'];
    if (!validStatuses.includes(updates.status as string)) {
      return json({ error: 'Invalid status' }, { status: 400 });
    }
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
  }

  const { error } = await locals.supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
};
