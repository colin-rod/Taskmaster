import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .is('list_id', null)
    .not('status', 'in', '("done","canceled")')
    .order('created_at', { ascending: false });

  return { tasks: tasks ?? [] };
};

export const actions: Actions = {
  createTask: async ({ request, locals: { supabase, session } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: session!.user.id,
      due_at,
      status: 'todo',
      priority: 4,
    });

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  toggleTask: async ({ request, locals: { supabase } }) => {
    return taskActions.toggleTask(await request.formData(), supabase);
  },
  updateTask: async ({ request, locals: { supabase } }) => {
    return taskActions.updateTask(await request.formData(), supabase);
  },
  deleteTask: async ({ request, locals: { supabase } }) => {
    return taskActions.deleteTask(await request.formData(), supabase);
  },
};
