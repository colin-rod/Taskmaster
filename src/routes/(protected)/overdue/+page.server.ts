import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import { visibleTo } from '$lib/server/task-visibility.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase, profileId } } = event;
  event.depends('app:tasks');

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const { data: tasks, error } = await visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
    .lt('due_at', startOfToday.toISOString())
    .not('status', 'in', '(done,canceled)')
    .order('due_at', { ascending: true });

  if (error) console.error('[overdue] Task query failed:', error.message);
  return { tasks: flattenTaskLabels(tasks ?? []) };
};

export const actions: Actions = {
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
