import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase } } = event;
  event.depends('app:tasks');

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
    .lt('due_at', startOfToday.toISOString())
    .not('status', 'in', '(done,canceled)')
    .order('due_at', { ascending: true });

  return { tasks: tasks ?? [] };
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
