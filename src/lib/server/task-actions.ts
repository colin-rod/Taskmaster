import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecurrenceRule } from '$lib/types/index.js';
import { computeNextDue } from '$lib/utils/recurrence.js';

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
        await rollForwardRecurringTask(task_id, task, supabase);
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
  const currentDue = task.due_at ? new Date(task.due_at) : new Date();
  const nextDue = computeNextDue(currentDue, task.recurrence_rule);

  if (!nextDue) {
    // Recurrence expired — complete normally
    return { rolled: false };
  }

  // Roll forward the task
  const { error } = await supabase.from('tasks').update({
    status: 'todo',
    completed_at: null,
    last_completed_at: new Date().toISOString(),
    due_at: nextDue.toISOString(),
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
  const due_at = formData.get('due_at')?.toString() || null;
  const status = formData.get('status')?.toString() || 'todo';
  const is_recurring = formData.get('is_recurring') === 'true';
  const recurrence_rule_raw = formData.get('recurrence_rule')?.toString();
  const recurrence_rule = is_recurring && recurrence_rule_raw ? JSON.parse(recurrence_rule_raw) : null;

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

  const updates: Record<string, unknown> = { title, notes, priority, due_at, status, is_recurring, recurrence_rule };
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
