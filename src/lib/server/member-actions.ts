import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

async function verifyOwner(supabase: SupabaseClient, listId: string, userId: string) {
  const { data } = await supabase
    .from('task_list_members')
    .select('role')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .single();

  return data?.role === 'owner';
}

export async function addMember(formData: FormData, supabase: SupabaseClient, sessionUserId: string) {
  const list_id = formData.get('list_id')?.toString();
  const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
  const role = formData.get('role')?.toString();

  if (!list_id || !email || !role) return fail(400, { error: 'List ID, email, and role are required' });
  if (role !== 'editor' && role !== 'viewer') return fail(400, { error: 'Role must be editor or viewer' });

  if (!(await verifyOwner(supabase, list_id, sessionUserId))) {
    return fail(403, { error: 'Only the list owner can manage members' });
  }

  // Look up profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) return fail(404, { error: 'No account found with that email' });

  // Check not already a member
  const { data: existing } = await supabase
    .from('task_list_members')
    .select('user_id')
    .eq('list_id', list_id)
    .eq('user_id', profile.id)
    .single();

  if (existing) return fail(409, { error: 'This user is already a member' });

  const { error } = await supabase
    .from('task_list_members')
    .insert({ list_id, user_id: profile.id, role });

  if (error) return fail(500, { error: error.message });
  return { success: true };
}

export async function removeMember(formData: FormData, supabase: SupabaseClient, sessionUserId: string) {
  const list_id = formData.get('list_id')?.toString();
  const user_id = formData.get('user_id')?.toString();

  if (!list_id || !user_id) return fail(400, { error: 'List ID and user ID are required' });
  if (user_id === sessionUserId) return fail(400, { error: 'Cannot remove yourself from the list' });

  if (!(await verifyOwner(supabase, list_id, sessionUserId))) {
    return fail(403, { error: 'Only the list owner can manage members' });
  }

  const { error } = await supabase
    .from('task_list_members')
    .delete()
    .eq('list_id', list_id)
    .eq('user_id', user_id);

  if (error) return fail(500, { error: error.message });

  // Unassign any tasks assigned to the removed member in this list
  await supabase
    .from('tasks')
    .update({ assigned_to_user_id: null })
    .eq('list_id', list_id)
    .eq('assigned_to_user_id', user_id);

  return { success: true };
}

export async function updateMemberRole(formData: FormData, supabase: SupabaseClient, sessionUserId: string) {
  const list_id = formData.get('list_id')?.toString();
  const user_id = formData.get('user_id')?.toString();
  const role = formData.get('role')?.toString();

  if (!list_id || !user_id || !role) return fail(400, { error: 'List ID, user ID, and role are required' });
  if (role !== 'editor' && role !== 'viewer') return fail(400, { error: 'Role must be editor or viewer' });
  if (user_id === sessionUserId) return fail(400, { error: 'Cannot change your own role' });

  if (!(await verifyOwner(supabase, list_id, sessionUserId))) {
    return fail(403, { error: 'Only the list owner can manage members' });
  }

  const { error } = await supabase
    .from('task_list_members')
    .update({ role })
    .eq('list_id', list_id)
    .eq('user_id', user_id);

  if (error) return fail(500, { error: error.message });
  return { success: true };
}
