import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, session } }) => {
  const { data: list } = await supabase
    .from('task_lists')
    .select('*, members:task_list_members(user_id, role, profile:profiles(email, display_name))')
    .eq('id', params.id)
    .single();

  if (!list) {
    error(404, 'List not found');
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return { list, tasks: tasks ?? [] };
};

export const actions: Actions = {
  createTask: async ({ request, params, locals: { supabase, session } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;

    if (!title) {
      return fail(400, { error: 'Task title is required' });
    }

    const { error: err } = await supabase.from('tasks').insert({
      title,
      list_id: params.id,
      owner_id: session!.user.id,
      due_at,
      status: 'todo',
      priority: 4,
    });

    if (err) {
      return fail(500, { error: err.message });
    }

    return { success: true };
  },

  updateTask: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const title = formData.get('title')?.toString()?.trim();
    const notes = formData.get('notes')?.toString() || null;
    const priority = Number(formData.get('priority') || 4);
    const due_at = formData.get('due_at')?.toString() || null;
    const status = formData.get('status')?.toString() || 'todo';

    if (!id || !title) {
      return fail(400, { error: 'Task ID and title are required' });
    }

    const updates: Record<string, unknown> = { title, notes, priority, due_at, status };

    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    const { error: err } = await supabase.from('tasks').update(updates).eq('id', id);

    if (err) {
      return fail(500, { error: err.message });
    }

    return { success: true };
  },

  toggleTask: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const currentStatus = formData.get('current_status')?.toString();

    if (!id) {
      return fail(400, { error: 'Task ID is required' });
    }

    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    const completed_at = newStatus === 'done' ? new Date().toISOString() : null;

    const { error: err } = await supabase
      .from('tasks')
      .update({ status: newStatus, completed_at })
      .eq('id', id);

    if (err) {
      return fail(500, { error: err.message });
    }

    return { success: true };
  },

  deleteTask: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Task ID is required' });
    }

    const { error: err } = await supabase.from('tasks').delete().eq('id', id);

    if (err) {
      return fail(500, { error: err.message });
    }

    return { success: true };
  },
};
