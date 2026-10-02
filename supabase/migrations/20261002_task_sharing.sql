-- Per-task sharing: private vs shared tasks for a multi-person household.
--
-- Context: until now every profile saw every task -- nothing was scoped to the
-- active profile, because the app only ever had one user. With a second person
-- using it, each task is now either private to its owner or shared with the
-- household. The rule the app applies everywhere (src/lib/server/task-visibility.ts):
--
--   a profile can see a task if it owns it, is assigned to it, or it is shared.
--
-- This is enforced in the server-side queries, not in RLS: all access still
-- goes through the service-role client, and RLS stays enabled with no policies
-- (see 20260814_enable_rls_deny_all.sql).

-- ---------------------------------------------------------------------------
-- 1. The flag. Existing tasks default to private to their owner.
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists is_shared boolean not null default false;

-- Tasks in lists that already have more than one member were shared in intent,
-- so keep them visible to the other members.
update public.tasks t
set is_shared = true
where t.list_id in (
  select list_id
  from public.task_list_members
  group by list_id
  having count(*) > 1
);

-- Smart views (Today, Overdue, Calendar) filter shared tasks by due date.
create index if not exists idx_tasks_shared_due
  on public.tasks (due_at)
  where is_shared;

-- ---------------------------------------------------------------------------
-- 2. Sidebar list counts, scoped to what the profile can see.
--
-- Replaces the zero-argument version from 20260315_list_task_counts_rpc.sql,
-- which counted every open task in every list. Only lists the profile is a
-- member of are returned, and only tasks matching the visibility rule are
-- counted, so a private task in a joint list doesn't inflate the other
-- person's badge.
-- ---------------------------------------------------------------------------

drop function if exists public.get_list_task_counts();

create or replace function public.get_list_task_counts(p_profile_id uuid)
returns table(list_id uuid, count bigint)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select t.list_id, count(*)::bigint
  from tasks t
  join task_list_members m
    on m.list_id = t.list_id
   and m.user_id = p_profile_id
  where t.status not in ('done', 'canceled')
    and (
      t.owner_id = p_profile_id
      or t.assigned_to_user_id = p_profile_id
      or t.is_shared
    )
  group by t.list_id;
$$;

-- Same hardening as 20260815_harden_functions.sql: only the service-role
-- client (which keeps EXECUTE) calls this, so remove the PostgREST RPC
-- endpoint for the public roles.
revoke execute on function public.get_list_task_counts(uuid) from public, anon, authenticated;
