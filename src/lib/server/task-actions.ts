import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

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
      await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', task_id)
        .neq('status', 'done');
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
// Task Actions
// =============================================================================

export async function toggleTask(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const currentStatus = formData.get('current_status')?.toString();

  if (!id) return fail(400, { error: 'Task ID is required' });

  const newStatus = currentStatus === 'done' ? 'todo' : 'done';
  const completed_at = newStatus === 'done' ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, completed_at })
    .eq('id', id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function updateTask(formData: FormData, supabase: SupabaseClient) {
  const id = formData.get('id')?.toString();
  const title = formData.get('title')?.toString()?.trim();
  const notes = formData.get('notes')?.toString() || null;
  const priority = Number(formData.get('priority') || 4);
  const due_at = formData.get('due_at')?.toString() || null;
  const status = formData.get('status')?.toString() || 'todo';

  if (!id || !title) return fail(400, { error: 'Task ID and title are required' });

  const updates: Record<string, unknown> = { title, notes, priority, due_at, status };
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
