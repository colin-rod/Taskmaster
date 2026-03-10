import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Overdue: due before start of today, not done/canceled
  const { data: overdue } = await supabase
    .from('tasks')
    .select('*, checklist_items(*)')
    .lt('due_at', startOfToday.toISOString())
    .not('status', 'in', '("done","canceled")')
    .order('due_at', { ascending: true });

  // Due today: due within today, not done/canceled
  const { data: dueToday } = await supabase
    .from('tasks')
    .select('*, checklist_items(*)')
    .gte('due_at', startOfToday.toISOString())
    .lte('due_at', endOfToday.toISOString())
    .not('status', 'in', '("done","canceled")')
    .order('due_at', { ascending: true });

  return {
    overdue: overdue ?? [],
    dueToday: dueToday ?? [],
  };
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
};
