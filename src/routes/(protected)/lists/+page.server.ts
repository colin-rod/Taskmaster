import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
  const { data: lists } = await supabase
    .from('task_lists')
    .select('*, members:task_list_members(user_id, role, profile:profiles(email, display_name))')
    .order('sort_order', { ascending: true });

  return { lists: lists ?? [] };
};

export const actions: Actions = {
  createList: async ({ request, locals: { supabase, session } }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString()?.trim();
    const color = formData.get('color')?.toString() || null;

    if (!name) {
      return fail(400, { error: 'List name is required' });
    }

    const { error } = await supabase
      .from('task_lists')
      .insert({ name, color, owner_id: session!.user.id });

    if (error) {
      return fail(500, { error: error.message });
    }

    return { success: true };
  },

  updateList: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const name = formData.get('name')?.toString()?.trim();
    const color = formData.get('color')?.toString() || null;

    if (!id || !name) {
      return fail(400, { error: 'List ID and name are required' });
    }

    const { error } = await supabase
      .from('task_lists')
      .update({ name, color })
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
