import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import { visibleTo, resolveIsShared, getListRole } from '$lib/server/task-visibility.js';
import * as memberActions from '$lib/server/member-actions.js';

export const load: PageServerLoad = async ({ params, locals: { supabase, profileId } }) => {
  const { data: list } = await supabase
    .from('task_lists')
    .select('*, members:task_list_members(user_id, role, profile:profiles(id, email, display_name, avatar_color, avatar_url))')
    .eq('id', params.id)
    .single();

  // Lists are only visible to their members; anyone else gets the same 404 as
  // for a list that doesn't exist.
  const members = (list?.members ?? []) as { user_id: string }[];
  if (!list || !members.some((m) => m.user_id === profileId)) {
    error(404, 'List not found');
  }

  const { data: tasks, error: taskError } = await visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
    .eq('list_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (taskError) console.error('[list] Task query failed:', taskError.message);

  const { data: labels } = await supabase
    .from('labels')
    .select('*')
    .eq('list_id', params.id)
    .order('sort_order', { ascending: true });

  // Household profiles that could still be added to this list (MemberManager).
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_color, avatar_url')
    .order('display_name', { ascending: true });

  const memberIds = new Set(members.map((m) => m.user_id));

  return {
    list,
    tasks: flattenTaskLabels(tasks ?? []),
    labels: labels ?? [],
    addableProfiles: (profiles ?? []).filter((p) => !memberIds.has(p.id)),
  };
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

    const reminder_at = formData.get('reminder_at')?.toString() || null;

    if (!title) return fail(400, { error: 'Task title is required' });

    const role = await getListRole(supabase, params.id, profileId!);
    if (role !== 'owner' && role !== 'editor') return fail(403, { error: 'You can\'t add tasks to this list' });

    const is_shared = await resolveIsShared(supabase, formData.get('is_shared'), params.id);

    const { data: newTask, error: err } = await supabase.from('tasks').insert({
      title,
      list_id: params.id,
      owner_id: profileId!,
      is_shared,
      due_at,
      reminder_at,
      status: 'todo',
      priority,
      is_recurring,
      recurrence_rule,
    }).select('id').single();

    if (err) return fail(500, { error: err.message });
    return { success: true, taskId: newTask.id };
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

    if ((await getListRole(supabase, params.id, profileId!)) !== 'owner') {
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
