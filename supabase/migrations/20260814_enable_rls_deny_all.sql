-- Enable RLS on all public tables (deny-by-default).
--
-- Context: 20260312_remove_auth.sql disabled RLS across the app. Because every
-- table in `public` is exposed through PostgREST, that left the entire dataset
-- readable and writable by anyone holding the anon key -- which ships in the
-- browser bundle and is public by design.
--
-- All application data access is server-side via the service-role key
-- (see src/hooks.server.ts), and service-role bypasses RLS. So enabling RLS
-- with NO policies denies anon/authenticated access without affecting the app.
--
-- Note: this supersedes the DISABLE ROW LEVEL SECURITY statements in
-- 20260312_remove_auth.sql and 20260322_labels.sql. Do not re-disable RLS
-- unless a client starts querying Supabase directly with the anon key, in
-- which case write real policies rather than turning RLS off.

alter table public.profiles           enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_lists         enable row level security;
alter table public.task_list_members  enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.labels             enable row level security;
alter table public.task_labels        enable row level security;

-- Drop the inert leftover policies. These reference auth.uid(), which is always
-- null now that the app uses a profile_id cookie instead of Supabase Auth, so
-- they never matched anything. Removing them clears the
-- policy_exists_rls_disabled lint and avoids implying protection that is not there.

drop policy if exists profiles_select            on public.profiles;
drop policy if exists profiles_update_own        on public.profiles;

drop policy if exists tasks_select               on public.tasks;
drop policy if exists tasks_insert               on public.tasks;
drop policy if exists tasks_update               on public.tasks;
drop policy if exists tasks_delete               on public.tasks;

drop policy if exists task_lists_select          on public.task_lists;
drop policy if exists task_lists_insert          on public.task_lists;
drop policy if exists task_lists_update          on public.task_lists;
drop policy if exists task_lists_delete          on public.task_lists;

drop policy if exists task_list_members_select   on public.task_list_members;
drop policy if exists task_list_members_insert   on public.task_list_members;
drop policy if exists task_list_members_update   on public.task_list_members;
drop policy if exists task_list_members_delete   on public.task_list_members;

drop policy if exists notifications_select       on public.notifications;
drop policy if exists notifications_insert       on public.notifications;
drop policy if exists notifications_update       on public.notifications;
drop policy if exists notifications_delete       on public.notifications;

drop policy if exists checklist_items_select     on public.checklist_items;
drop policy if exists checklist_items_insert     on public.checklist_items;
drop policy if exists checklist_items_update     on public.checklist_items;
drop policy if exists checklist_items_delete     on public.checklist_items;
