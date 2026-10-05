import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import * as taskActions from '$lib/server/task-actions.js';
import { TASK_SELECT, flattenTaskLabels } from '$lib/server/task-actions.js';
import { visibleTo, resolveIsShared } from '$lib/server/task-visibility.js';
import { addDaysToKey, dateKeyToIso, startOfDayInZone, todayKey } from '$lib/utils/dates.js';

export const load: PageServerLoad = async (event) => {
  const { locals: { supabase, profileId, timeZone } } = event;
  event.depends('app:tasks');
  // "Today" is the profile's local date. Due dates are calendar dates stored
  // as midnight UTC; completed_at is a real instant, so that range is the
  // local day's actual start and end.
  const today = todayKey(timeZone);
  const tomorrow = addDaysToKey(today, 1);
  const todayIso = dateKeyToIso(today);
  const tomorrowIso = dateKeyToIso(tomorrow);
  const sevenDaysOutIso = dateKeyToIso(addDaysToKey(today, 7));

  // Fetch overdue, due-today, upcoming, and completed-today in parallel
  const [{ data: overdue, error: e1 }, { data: dueToday, error: e2 }, { data: upcoming, error: e3 }, { data: completedToday, error: e4 }] = await Promise.all([
    visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
      .lt('due_at', todayIso)
      .not('status', 'in', '("done","canceled")')
      .order('due_at', { ascending: true }),
    visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
      .gte('due_at', todayIso)
      .lt('due_at', tomorrowIso)
      .not('status', 'in', '("done","canceled")')
      .order('due_at', { ascending: true }),
    visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
      .gte('due_at', tomorrowIso)
      .lte('due_at', sevenDaysOutIso)
      .not('status', 'in', '("done","canceled")')
      .order('due_at', { ascending: true }),
    visibleTo(supabase.from('tasks').select(TASK_SELECT), profileId!)
      .gte('completed_at', startOfDayInZone(today, timeZone).toISOString())
      .lt('completed_at', startOfDayInZone(tomorrow, timeZone).toISOString())
      .order('completed_at', { ascending: false }),
  ]);

  for (const [label, err] of [['overdue', e1], ['dueToday', e2], ['upcoming', e3], ['completedToday', e4]] as const) {
    if (err) console.error(`[today:${label}] Task query failed:`, err.message);
  }

  return {
    overdue: flattenTaskLabels(overdue ?? []),
    dueToday: flattenTaskLabels(dueToday ?? []),
    upcoming: flattenTaskLabels(upcoming ?? []),
    completedToday: flattenTaskLabels(completedToday ?? []),
  };
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
