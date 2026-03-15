import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*)')
    .is('list_id', null)
    .order('created_at', { ascending: false });

  return { tasks: tasks ?? [], roleMap: {} as Record<string, string> };
};

export const actions: Actions = {
  createTask: async ({ request, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;
    const priorityRaw = parseInt(formData.get('priority')?.toString() ?? '4', 10);
    const priority = [1, 2, 3, 4].includes(priorityRaw) ? priorityRaw : 4;

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
      due_at,
      status: 'todo',
      priority,
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
  addChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.addChecklistItem(await request.formData(), supabase);
  },
  toggleChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.toggleChecklistItem(await request.formData(), supabase);
  },
  deleteChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.deleteChecklistItem(await request.formData(), supabase);
  },
};
