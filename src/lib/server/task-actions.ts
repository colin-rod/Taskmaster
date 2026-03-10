import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

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
