import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  sevenDaysOut.setHours(23, 59, 59, 999);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .gt('due_at', endOfToday.toISOString())
    .lte('due_at', sevenDaysOut.toISOString())
    .not('status', 'in', '("done","canceled")')
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
};
