import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import * as memberActions from '$lib/server/member-actions.js';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const { data: list } = await supabase
    .from('task_lists')
    .select('*, members:task_list_members(user_id, role, profile:profiles(email, display_name))')
    .eq('id', params.id)
    .single();

  if (!list) {
    error(404, 'List not found');
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), assignee:profiles!assigned_to_user_id(id, email, display_name)')
    .eq('list_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return { list, tasks: tasks ?? [] };
};

export const actions: Actions = {
  createTask: async ({ request, params, locals: { supabase, profileId } }) => {
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

    const { error: err } = await supabase.from('tasks').insert({
      title,
      list_id: params.id,
      owner_id: profileId!,
      due_at,
      status: 'todo',
      priority,
      is_recurring,
      recurrence_rule,
    });

    if (err) return fail(500, { error: err.message });
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
  addMember: async ({ request, locals: { supabase, profileId } }) => {
    return memberActions.addMember(await request.formData(), supabase, profileId!);
  },
  removeMember: async ({ request, locals: { supabase, profileId } }) => {
    return memberActions.removeMember(await request.formData(), supabase, profileId!);
  },
  updateMemberRole: async ({ request, locals: { supabase, profileId } }) => {
    return memberActions.updateMemberRole(await request.formData(), supabase, profileId!);
  },

  updateListAppearance: async ({ request, params, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const icon = formData.get('icon')?.toString();
    const color = formData.get('color')?.toString() || null;

    if (!icon) return fail(400, { error: 'Icon is required' });

    const { data: membership } = await supabase
      .from('task_list_members')
      .select('role')
      .eq('list_id', params.id)
      .eq('user_id', profileId!)
      .single();

    if (membership?.role !== 'owner') {
      return fail(403, { error: 'Only the list owner can change the appearance' });
    }

    const { error: err } = await supabase
      .from('task_lists')
      .update({ icon, color })
      .eq('id', params.id);

    if (err) return fail(500, { error: err.message });
    return { success: true };
  },
};
