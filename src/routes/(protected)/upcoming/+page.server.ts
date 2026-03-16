import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase } } = event;
  event.depends('app:tasks');
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  sevenDaysOut.setHours(23, 59, 59, 999);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
    .gt('due_at', endOfToday.toISOString())
    .lte('due_at', sevenDaysOut.toISOString())
    .order('due_at', { ascending: true });

  return { tasks: tasks ?? [] };
};

export const actions: Actions = {
  createTask: async ({ request, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;
    const priorityRaw = parseInt(formData.get('priority')?.toString() ?? '4', 10);
    const priority = [1, 2, 3, 4].includes(priorityRaw) ? priorityRaw : 4;
    const is_recurring = formData.get('is_recurring') === 'true';
    const recurrence_rule_raw = formData.get('recurrence_rule')?.toString() || null;
    let recurrence_rule = null;
    if (is_recurring && recurrence_rule_raw) {
      try { recurrence_rule = JSON.parse(recurrence_rule_raw); } catch {}
    }

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
      due_at,
      status: 'todo',
      priority,
      is_recurring,
      recurrence_rule,
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
