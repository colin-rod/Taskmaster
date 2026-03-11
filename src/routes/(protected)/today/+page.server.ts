import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Fetch overdue and due-today in parallel
  const [{ data: overdue }, { data: dueToday }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
      .lt('due_at', startOfToday.toISOString())
      .not('status', 'in', '("done","canceled")')
      .order('due_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
      .gte('due_at', startOfToday.toISOString())
      .lte('due_at', endOfToday.toISOString())
      .not('status', 'in', '("done","canceled")')
      .order('due_at', { ascending: true }),
  ]);

  const allTasks = [...(overdue ?? []), ...(dueToday ?? [])];
  const roleMap = await taskActions.buildRoleMap(allTasks, session!.user.id, supabase);

  return {
    overdue: overdue ?? [],
    dueToday: dueToday ?? [],
    roleMap,
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
  assignTask: async ({ request, locals: { supabase, session } }) => {
    return taskActions.assignTask(await request.formData(), supabase, session!.user.id);
  },
};
