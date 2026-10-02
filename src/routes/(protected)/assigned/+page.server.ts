import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import { visibleTo, resolveIsShared } from '$lib/server/task-visibility.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase, profileId } } = event;
  event.depends('app:tasks');
  const { data: tasks, error } = await visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
    .eq('assigned_to_user_id', profileId!)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) console.error('[assigned] Task query failed:', error.message);
  return { tasks: flattenTaskLabels(tasks ?? []) };
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

    if (!title) return fail(400, { error: 'Task title is required' });

    const is_shared = await resolveIsShared(supabase, formData.get('is_shared'), null);

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
      is_shared,
      due_at,
      status: 'todo',
      priority,
      is_recurring,
      recurrence_rule,
    });

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
  toggleTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.toggleTask(await request.formData(), supabase, profileId!);
  },
  updateTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.updateTask(await request.formData(), supabase, profileId!);
  },
  deleteTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.deleteTask(await request.formData(), supabase, profileId!);
  },
  addChecklistItem: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.addChecklistItem(await request.formData(), supabase, profileId!);
  },
  toggleChecklistItem: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.toggleChecklistItem(await request.formData(), supabase, profileId!);
  },
  deleteChecklistItem: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.deleteChecklistItem(await request.formData(), supabase, profileId!);
  },
  editChecklistItem: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.editChecklistItem(await request.formData(), supabase, profileId!);
  },
  reorderChecklistItems: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.reorderChecklistItems(await request.formData(), supabase, profileId!);
  },
  assignTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.assignTask(await request.formData(), supabase, profileId!);
  },
};
