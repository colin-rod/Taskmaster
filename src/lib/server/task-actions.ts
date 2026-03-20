import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecurrenceRule } from '$lib/types/index.js';
import { computeNextDue } from '$lib/utils/recurrence.js';
import { buildDueAt } from '$lib/utils/dates.js';

// =============================================================================
// Role Map Helper
// =============================================================================

export async function buildRoleMap(
  tasks: { list_id: string | null }[],
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const listIds = [...new Set(tasks.map((t) => t.list_id).filter(Boolean))] as string[];
  if (listIds.length === 0) return {};

  const { data: memberships } = await supabase
    .from('task_list_members')
    .select('list_id, role')
    .eq('user_id', userId)
    .in('list_id', listIds);

  return Object.fromEntries((memberships ?? []).map((m) => [m.list_id, m.role]));
}

// =============================================================================
// Checklist Item Actions
// =============================================================================

export async function addChecklistItem(formData: FormData, supabase: SupabaseClient) {
  const task_id = formData.get('task_id')?.toString();
  const label = formData.get('label')?.toString()?.trim();

  if (!task_id || !label) return fail(400, { error: 'Task ID and label are required' });

  // Get next position
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('position')
    .eq('task_id', task_id)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { error } = await supabase
    .from('checklist_items')
    .insert({ task_id, label, position });

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function toggleChecklistItem(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const task_id = formData.get('task_id')?.toString();
  const is_completed = formData.get('is_completed') === 'true';

  if (!id || !task_id) return fail(400, { error: 'Item ID and task ID are required' });

  const newCompleted = !is_completed;

  const { error } = await supabase
    .from('checklist_items')
    .update({ is_completed: newCompleted })
    .eq('id', id);

  if (error) return fail(500, { error: error.message });

  // Auto-complete: if all items are now completed, mark the task as done
  if (newCompleted) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_completed')
      .eq('task_id', task_id);

    if (items && items.length > 0 && items.every((item) => item.is_completed)) {
      // Check if this is a recurring task
      const { data: task } = await supabase
        .from('tasks')
        .select('is_recurring, recurrence_rule, due_at')
        .eq('id', task_id)
        .single();

      if (task?.is_recurring && task.recurrence_rule) {
        const result = await rollForwardRecurringTask(task_id, task, supabase);
        if (result.rolled) return { success: true, rolled: true };
      } else {
        await supabase
          .from('tasks')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', task_id)
          .neq('status', 'done');
      }
    }
  }

  return { success: true };
}

export async function editChecklistItem(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const label = formData.get('label')?.toString()?.trim();

  if (!id || !label) return fail(400, { error: 'ID and label are required' });

  const { error } = await supabase.from('checklist_items').update({ label }).eq('id', id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function deleteChecklistItem(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();

  if (!id) return fail(400, { error: 'Item ID is required' });

  const { error } = await supabase.from('checklist_items').delete().eq('id', id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function reorderChecklistItems(formData: FormData, supabase: SupabaseClient) {
  const itemIds = formData.get('item_ids')?.toString();

  if (!itemIds) return fail(400, { error: 'Item IDs are required' });

  const ids = JSON.parse(itemIds) as string[];

  // Update positions in order
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from('checklist_items')
      .update({ position: i })
      .eq('id', ids[i]);

    if (error) return fail(500, { error: error.message });
  }

  return { success: true };
}

// =============================================================================
// Recurring Task Helper
// =============================================================================

async function rollForwardRecurringTask(
  taskId: string,
  task: { due_at: string | null; recurrence_rule: RecurrenceRule },
  supabase: SupabaseClient
): Promise<{ rolled: boolean }> {
  const scheduleType = task.recurrence_rule.schedule_type ?? 'due_date';
  const baseDate =
    scheduleType === 'completion_date'
      ? new Date()
      : task.due_at
        ? new Date(task.due_at)
        : new Date();
  const nextDue = computeNextDue(baseDate, task.recurrence_rule);

  if (!nextDue) {
    // Recurrence expired — complete normally
    return { rolled: false };
  }

  // Build updated rule (increment occurrences_completed if after_n_occurrences)
  let updatedRule: RecurrenceRule = task.recurrence_rule;
  if (task.recurrence_rule.ends?.type === 'after_n_occurrences') {
    updatedRule = {
      ...task.recurrence_rule,
      ends: {
        ...task.recurrence_rule.ends,
        occurrences_completed: task.recurrence_rule.ends.occurrences_completed + 1,
      },
    };
  }

  // Roll forward the task
  const { error } = await supabase.from('tasks').update({
    status: 'todo',
    completed_at: null,
    last_completed_at: new Date().toISOString(),
    due_at: nextDue.toISOString(),
    reminder_at: null,
    recurrence_rule: updatedRule,
  }).eq('id', taskId);

  if (error) return { rolled: false };

  // Reset checklist items
  await supabase.from('checklist_items')
    .update({ is_completed: false })
    .eq('task_id', taskId);

  return { rolled: true };
}

// =============================================================================
// Task Actions
// =============================================================================

export async function toggleTask(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const currentStatus = formData.get('current_status')?.toString();

  if (!id) return fail(400, { error: 'Task ID is required' });

  if (currentStatus !== 'done') {
    // Completing the task — check if recurring
    const { data: task } = await supabase
      .from('tasks')
      .select('is_recurring, recurrence_rule, due_at')
      .eq('id', id)
      .single();

    if (task?.is_recurring && task.recurrence_rule) {
      const result = await rollForwardRecurringTask(id, task, supabase);
      if (result.rolled) {
        return { success: true, rolled: true };
      }
    }

    // Non-recurring or expired recurrence: complete normally
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return fail(500, { error: error.message });
  } else {
    // Reopening: just set back to todo
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'todo', completed_at: null })
      .eq('id', id);
    if (error) return fail(500, { error: error.message });
  }

  return { success: true };
}

export async function updateTask(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const title = formData.get('title')?.toString()?.trim();
  const notes = formData.get('notes')?.toString() || null;
  const priority = Number(formData.get('priority') || 4);
  const due_at_raw = formData.get('due_at')?.toString() || '';
  const due_time = formData.get('due_time')?.toString() || '';
  const due_at = buildDueAt(due_at_raw, due_time);
  const status = formData.get('status')?.toString() || 'todo';
  const is_recurring = formData.get('is_recurring') === 'true';
  const recurrence_rule_raw = formData.get('recurrence_rule')?.toString();
  const recurrence_rule = is_recurring && recurrence_rule_raw ? JSON.parse(recurrence_rule_raw) : null;
  const reminder_at_raw = formData.get('reminder_at')?.toString() || null;
  const reminder_at = reminder_at_raw ? new Date(reminder_at_raw).toISOString() : null;

  if (!id || !title) return fail(400, { error: 'Task ID and title are required' });

  // If marking done and recurring, roll forward instead
  if (status === 'done' && is_recurring && recurrence_rule) {
    // First save any field changes (title, notes, etc.) without status change
    const fieldUpdates: Record<string, unknown> = { title, notes, priority, is_recurring, recurrence_rule };
    await supabase.from('tasks').update(fieldUpdates).eq('id', id);

    const result = await rollForwardRecurringTask(id, { due_at, recurrence_rule }, supabase);
    if (result.rolled) {
      return { success: true, rolled: true };
    }
  }

  const updates: Record<string, unknown> = { title, notes, priority, due_at, status, is_recurring, recurrence_rule, reminder_at };
  updates.completed_at = status === 'done' ? new Date().toISOString() : null;

  const { error } = await supabase.from('tasks').update(updates).eq('id', id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function deleteTask(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();

  if (!id) return fail(400, { error: 'Task ID is required' });

  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function assignTask(formData: FormData, supabase: SupabaseClient, sessionUserId: string) {
  const id = formData.get('id')?.toString();
  const assigned_to_user_id = formData.get('assigned_to_user_id')?.toString() || null;

  if (!id) return fail(400, { error: 'Task ID is required' });

  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to_user_id })
    .eq('id', id);

  if (error) return fail(500, { error: error.message });

  // Create notification for the assignee (skip self-assignment)
  if (assigned_to_user_id && assigned_to_user_id !== sessionUserId) {
    await supabase.from('notifications').upsert(
      {
        user_id: assigned_to_user_id,
        task_id: id,
        type: 'assigned',
        delivered_at: new Date().toISOString(),
        is_read: false,
      },
      { onConflict: 'task_id,type' }
    );
  }

  return { success: true };
}
