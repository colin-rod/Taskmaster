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
  createTask: async ({ request, params, locals: { supabase, session } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error: err } = await supabase.from('tasks').insert({
      title,
      list_id: params.id,
      owner_id: session!.user.id,
      due_at,
      status: 'todo',
      priority: 4,
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
  assignTask: async ({ request, locals: { supabase, session } }) => {
    return taskActions.assignTask(await request.formData(), supabase, session!.user.id);
  },
  addMember: async ({ request, locals: { supabase, session } }) => {
    return memberActions.addMember(await request.formData(), supabase, session!.user.id);
  },
  removeMember: async ({ request, locals: { supabase, session } }) => {
    return memberActions.removeMember(await request.formData(), supabase, session!.user.id);
  },
  updateMemberRole: async ({ request, locals: { supabase, session } }) => {
    return memberActions.updateMemberRole(await request.formData(), supabase, session!.user.id);
  },
};
