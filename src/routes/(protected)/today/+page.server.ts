import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async ({ locals: { supabase, profileId } }) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  sevenDaysOut.setHours(23, 59, 59, 999);

  // Fetch overdue, due-today, and upcoming in parallel
  const [{ data: overdue }, { data: dueToday }, { data: upcoming }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
      .lt('due_at', startOfToday.toISOString())
      .order('due_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
      .gte('due_at', startOfToday.toISOString())
      .lte('due_at', endOfToday.toISOString())
      .order('due_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
      .gt('due_at', endOfToday.toISOString())
      .lte('due_at', sevenDaysOut.toISOString())
      .order('due_at', { ascending: true }),
  ]);

  const allTasks = [...(overdue ?? []), ...(dueToday ?? []), ...(upcoming ?? [])];
  const roleMap = await taskActions.buildRoleMap(allTasks, profileId!, supabase);

  return {
    overdue: overdue ?? [],
    dueToday: dueToday ?? [],
    upcoming: upcoming ?? [],
    roleMap,
  };
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
  assignTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.assignTask(await request.formData(), supabase, profileId!);
  },
};
