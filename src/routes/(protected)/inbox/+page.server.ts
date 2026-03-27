import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import type { TaskList } from '$lib/types/index.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase, profileId } } = event;
  event.depends('app:tasks');
  const [{ data: tasks, error }, { data: listMemberships }] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .is('list_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('task_list_members')
      .select('role, list:task_lists(id, name, color, icon, owner_id, sort_order, created_at, updated_at)')
      .eq('user_id', profileId!)
      .in('role', ['owner', 'editor']),
  ]);

  if (error) console.error('[inbox] Task query failed:', error.message);
  const lists = ((listMemberships ?? [])
    .map((m) => m.list)
    .filter(Boolean) as unknown as TaskList[])
    .sort((a, b) => a.sort_order - b.sort_order);

  return { tasks: flattenTaskLabels(tasks ?? []), lists };
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
      try { recurrence_rule = JSON.parse(recurrence_rule_raw); } catch { /* ignore */ }
    }

    const reminder_at = formData.get('reminder_at')?.toString() || null;

    if (!title) return fail(400, { error: 'Task title is required' });

    const { data: newTask, error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
      due_at,
      reminder_at,
      status: 'todo',
      priority,
      is_recurring,
      recurrence_rule,
    }).select('id').single();

    if (error) return fail(500, { error: error.message });
    return { success: true, taskId: newTask.id };
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
  editChecklistItem: async ({ request, locals: { supabase } }) => {
    return taskActions.editChecklistItem(await request.formData(), supabase);
  },
  reorderChecklistItems: async ({ request, locals: { supabase } }) => {
    return taskActions.reorderChecklistItems(await request.formData(), supabase);
  },
};
