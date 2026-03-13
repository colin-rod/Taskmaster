import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: lists } = await supabase
    .from('task_lists')
    .select('*, members:task_list_members(user_id, role, profile:profiles(email, display_name))')
    .order('sort_order', { ascending: true });

  return { lists: lists ?? [] };
};

export const actions: Actions = {
  createList: async ({ request, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString()?.trim();
    const color = formData.get('color')?.toString() || null;
    const icon = formData.get('icon')?.toString() || 'list';

    if (!name) {
      return fail(400, { error: 'List name is required' });
    }

    const { data: newList, error } = await supabase
      .from('task_lists')
      .insert({ name, color, icon, owner_id: profileId! })
      .select('id')
      .single();

    if (error || !newList) {
      return fail(500, { error: error?.message ?? 'Failed to create list' });
    }

    // Ensure owner has a membership row for uniform role resolution
    await supabase
      .from('task_list_members')
      .insert({ list_id: newList.id, user_id: profileId!, role: 'owner' });

    return { success: true };
  },

  updateList: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const name = formData.get('name')?.toString()?.trim();
    const color = formData.get('color')?.toString() || null;
    const icon = formData.get('icon')?.toString() || 'list';

    if (!id || !name) {
      return fail(400, { error: 'List ID and name are required' });
    }

    const { error } = await supabase
      .from('task_lists')
      .update({ name, color, icon })
      .eq('id', id);

    if (error) {
      return fail(500, { error: error.message });
    }

    return { success: true };
  },

  deleteList: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'List ID is required' });
    }

    // Move tasks to inbox (list_id = null) before deleting
    await supabase
      .from('tasks')
      .update({ list_id: null })
      .eq('list_id', id);

    const { error } = await supabase
      .from('task_lists')
      .delete()
      .eq('id', id);

    if (error) {
      return fail(500, { error: error.message });
    }

    return { success: true };
  },
};
