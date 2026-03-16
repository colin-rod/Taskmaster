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

const ALLOWED_FIELDS = new Set(['title', 'priority', 'due_at', 'reminder_at', 'assigned_to_user_id', 'status', 'notes', 'is_recurring', 'recurrence_rule']);

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

  if ('notes' in updates) {
    if (updates.notes !== null && typeof updates.notes !== 'string') {
      return json({ error: 'Notes must be a string or null' }, { status: 400 });
    }
  }

  if ('due_at' in updates) {
    if (updates.due_at !== null && typeof updates.due_at !== 'string') {
      return json({ error: 'due_at must be an ISO string or null' }, { status: 400 });
    }
  }

  if ('is_recurring' in updates) {
    updates.is_recurring = Boolean(updates.is_recurring);
  }

  if ('recurrence_rule' in updates) {
    if (updates.recurrence_rule !== null && typeof updates.recurrence_rule === 'string') {
      try {
        updates.recurrence_rule = JSON.parse(updates.recurrence_rule);
      } catch {
        return json({ error: 'recurrence_rule must be valid JSON or null' }, { status: 400 });
      }
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
