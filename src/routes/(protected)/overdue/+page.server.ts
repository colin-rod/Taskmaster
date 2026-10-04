import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import { visibleTo } from '$lib/server/task-visibility.js';
import { dateKeyToIso, todayKey } from '$lib/utils/dates.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase, profileId, timeZone } } = event;
  event.depends('app:tasks');

  // Overdue means due before the profile's local date.
  const todayIso = dateKeyToIso(todayKey(timeZone));

  const { data: tasks, error } = await visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
    .lt('due_at', todayIso)
    .not('status', 'in', '(done,canceled)')
    .order('due_at', { ascending: true });

  if (error) console.error('[overdue] Task query failed:', error.message);
  return { tasks: flattenTaskLabels(tasks ?? []) };
};

export const actions: Actions = {
  toggleTask: async ({ request, locals: { supabase, profileId, timeZone } }) => {
    return taskActions.toggleTask(await request.formData(), supabase, profileId!, timeZone);
  },
  updateTask: async ({ request, locals: { supabase, profileId, timeZone } }) => {
    return taskActions.updateTask(await request.formData(), supabase, profileId!, timeZone);
  },
  deleteTask: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.deleteTask(await request.formData(), supabase, profileId!);
  },
  addChecklistItem: async ({ request, locals: { supabase, profileId } }) => {
    return taskActions.addChecklistItem(await request.formData(), supabase, profileId!);
  },
  toggleChecklistItem: async ({ request, locals: { supabase, profileId, timeZone } }) => {
    return taskActions.toggleChecklistItem(await request.formData(), supabase, profileId!, timeZone);
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
