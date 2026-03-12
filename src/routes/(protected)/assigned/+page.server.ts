import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase, profileId } }) => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
    .eq('assigned_to_user_id', profileId!)
    .not('status', 'in', '("done","canceled")')
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  const roleMap = await taskActions.buildRoleMap(tasks ?? [], profileId!, supabase);

  return { tasks: tasks ?? [], roleMap };
};

export const actions: Actions = {
  createTask: async ({ request, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
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
  addChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.addChecklistItem(await request.formData(), supabase);
  },
  toggleChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.toggleChecklistItem(await request.formData(), supabase);
  },
  deleteChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.deleteChecklistItem(await request.formData(), supabase);
  },
  assignTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.assignTask(await request.formData(), supabase, profileId!);
  },
};
