import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Task Visibility
//
// A profile can see a task if it owns it, is assigned to it, or the task is
// shared with the household. Every tasks read and write goes through this rule.
// It lives in the queries rather than RLS because all access is via the
// service-role client (see AGENTS.md).
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export interface TaskVisibilityFields {
  owner_id: string;
  assigned_to_user_id: string | null;
  is_shared: boolean;
}

export function isTaskVisibleTo(task: TaskVisibilityFields, profileId: string): boolean {
  return task.owner_id === profileId || task.assigned_to_user_id === profileId || task.is_shared === true;
}

/**
 * PostgREST `or` filter for the visibility rule. The profile id comes from a
 * cookie and is interpolated into the filter string, so anything that isn't a
 * UUID is rejected rather than escaped.
 */
export function visibilityFilter(profileId: string): string {
  if (!isUuid(profileId)) throw new Error('Invalid profile id');
  return `owner_id.eq.${profileId},assigned_to_user_id.eq.${profileId},is_shared.eq.true`;
}

/** Restrict a `tasks` query to the tasks the profile can see. */
export function visibleTo<Q extends { or(filters: string): Q }>(query: Q, profileId: string): Q {
  return query.or(visibilityFilter(profileId));
}

/**
 * Load the visibility fields for a task, or null when the task doesn't exist
 * or the profile can't see it. Callers treat both cases as "not found".
 */
export async function getAccessibleTask(
  supabase: SupabaseClient,
  taskId: string,
  profileId: string
): Promise<(TaskVisibilityFields & { id: string; list_id: string | null }) | null> {
  if (!isUuid(taskId)) return null;

  const { data } = await supabase
    .from('tasks')
    .select('id, list_id, owner_id, assigned_to_user_id, is_shared')
    .eq('id', taskId)
    .maybeSingle();

  if (!data || !isTaskVisibleTo(data, profileId)) return null;
  return data;
}

/** Ids of the lists the profile is a member of. */
export async function getMemberListIds(supabase: SupabaseClient, profileId: string): Promise<string[]> {
  const { data } = await supabase
    .from('task_list_members')
    .select('list_id')
    .eq('user_id', profileId);

  return (data ?? []).map((m) => m.list_id);
}

/** The profile's role in a list, or null when it isn't a member. */
export async function getListRole(
  supabase: SupabaseClient,
  listId: string,
  profileId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('task_list_members')
    .select('role')
    .eq('list_id', listId)
    .eq('user_id', profileId)
    .maybeSingle();

  return data?.role ?? null;
}

/**
 * Default for a new task's `is_shared`: an explicit form value wins, otherwise
 * tasks created in a list with more than one member are shared and everything
 * else is private.
 */
export async function resolveIsShared(
  supabase: SupabaseClient,
  formValue: FormDataEntryValue | null,
  listId: string | null
): Promise<boolean> {
  if (formValue === 'true') return true;
  if (formValue === 'false') return false;
  if (!listId) return false;

  const { count } = await supabase
    .from('task_list_members')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);

  return (count ?? 0) > 1;
}
