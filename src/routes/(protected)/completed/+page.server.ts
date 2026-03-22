import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase } } = event;
  event.depends('app:tasks');

  const { data: tasks } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .in('status', ['done', 'canceled'])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { tasks: flattenTaskLabels(tasks ?? []) };
};

export const actions: Actions = {
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
  editChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.editChecklistItem(await request.formData(), supabase);
  },
  reorderChecklistItems: async ({ request, locals: { supabase } }) => {
    return taskActions.reorderChecklistItems(await request.formData(), supabase);
  },
  assignTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.assignTask(await request.formData(), supabase, profileId!);
  },
};
