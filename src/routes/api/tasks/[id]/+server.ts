import { json } from '@sveltejs/kit';
import { flattenTaskLabels } from '$lib/server/task-actions.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: task, error: err } = await locals.supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name, avatar_color), list:task_lists(id, name, color, owner_id, sort_order, created_at, updated_at), task_labels(label:labels(*))')
    .eq('id', params.id)
    .single();

  if (err || !task) {
    return json({ error: 'Task not found' }, { status: 404 });
  }

  flattenTaskLabels([task]);
  return json({ task });
};

const ALLOWED_FIELDS = new Set(['title', 'priority', 'due_at', 'reminder_at', 'assigned_to_user_id', 'status', 'notes', 'is_recurring', 'recurrence_rule', 'start_at', 'duration_minutes', 'progress_current', 'progress_total', 'list_id']);

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

  if ('start_at' in updates) {
    if (updates.start_at !== null && typeof updates.start_at !== 'string') {
      return json({ error: 'start_at must be an ISO string or null' }, { status: 400 });
    }
  }

  if ('duration_minutes' in updates) {
    if (updates.duration_minutes !== null) {
      const dm = Number(updates.duration_minutes);
      if (!Number.isInteger(dm) || dm <= 0) {
        return json({ error: 'duration_minutes must be a positive integer or null' }, { status: 400 });
      }
      updates.duration_minutes = dm;
    }
  }

  if ('progress_current' in updates) {
    if (updates.progress_current !== null) {
      const pc = Number(updates.progress_current);
      if (!Number.isInteger(pc) || pc < 0) {
        return json({ error: 'progress_current must be a non-negative integer or null' }, { status: 400 });
      }
      updates.progress_current = pc;
    }
  }

  if ('progress_total' in updates) {
    if (updates.progress_total !== null) {
      const pt = Number(updates.progress_total);
      if (!Number.isInteger(pt) || pt < 0) {
        return json({ error: 'progress_total must be a non-negative integer or null' }, { status: 400 });
      }
      updates.progress_total = pt;
    }
  }

  // Auto-complete when progress_current reaches progress_total
  if (!('status' in updates)) {
    // We may need to look at current task values if only one side is being updated
    const currentVal = updates.progress_current;
    const totalVal = updates.progress_total;
    if (currentVal !== undefined && totalVal !== undefined && currentVal !== null && totalVal !== null && (currentVal as number) >= (totalVal as number) && (totalVal as number) > 0) {
      updates.status = 'done';
      updates.completed_at = new Date().toISOString();
    } else if (currentVal !== undefined && totalVal === undefined) {
      // Only current was updated — fetch the task to check total
      const { data: existing } = await locals.supabase
        .from('tasks')
        .select('progress_total, status')
        .eq('id', id)
        .single();
      if (existing && existing.progress_total != null && currentVal !== null && (currentVal as number) >= existing.progress_total && existing.progress_total > 0 && existing.status !== 'done') {
        updates.status = 'done';
        updates.completed_at = new Date().toISOString();
      }
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

  if ('list_id' in updates) {
    const listId = updates.list_id;
    if (listId !== null && (typeof listId !== 'string' || !/^[0-9a-f-]{36}$/i.test(listId))) {
      return json({ error: 'list_id must be a valid UUID or null' }, { status: 400 });
    }
  }

  const { error } = await locals.supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  // After moving to a new list, clean up invalid assignee and labels
  if (!error && 'list_id' in updates) {
    const newListId = updates.list_id as string | null;

    // Fetch current task to get assignee and labels
    const { data: task } = await locals.supabase
      .from('tasks')
      .select('assigned_to_user_id')
      .eq('id', id)
      .single();

    if (task?.assigned_to_user_id && newListId) {
      // Check if assignee is a member of the new list
      const { data: membership } = await locals.supabase
        .from('task_list_members')
        .select('user_id')
        .eq('list_id', newListId)
        .eq('user_id', task.assigned_to_user_id)
        .maybeSingle();

      if (!membership) {
        await locals.supabase
          .from('tasks')
          .update({ assigned_to_user_id: null })
          .eq('id', id);
      }
    } else if (task?.assigned_to_user_id && !newListId) {
      // Moving to inbox — clear assignee
      await locals.supabase
        .from('tasks')
        .update({ assigned_to_user_id: null })
        .eq('id', id);
    }

    // Remove labels scoped to a different list (labels with list_id that doesn't match the new list)
    const { data: taskLabels } = await locals.supabase
      .from('task_labels')
      .select('label_id, label:labels(list_id)')
      .eq('task_id', id);

    if (taskLabels) {
      const invalidLabelIds = taskLabels
        .filter((tl) => {
          const labelListId = (tl.label as { list_id: string | null } | null)?.list_id ?? null;
          // Keep labels with no list (personal) or matching the new list
          return labelListId !== null && labelListId !== newListId;
        })
        .map((tl) => tl.label_id);

      if (invalidLabelIds.length > 0) {
        await locals.supabase
          .from('task_labels')
          .delete()
          .eq('task_id', id)
          .in('label_id', invalidLabelIds);
      }
    }
  }

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
};
