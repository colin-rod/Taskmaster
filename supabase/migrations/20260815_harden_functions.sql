-- Address the Supabase security linter warnings on public functions.
--
-- Two classes of warning:
--
-- 1. function_search_path_mutable (11 functions)
--    A function without a pinned search_path resolves unqualified names using
--    the caller's search_path. For a SECURITY DEFINER function that is a real
--    escalation path: a caller who can create objects in a schema earlier on
--    the path can shadow a table or operator the function body references and
--    have it run as the definer. Pinning search_path closes that.
--
-- 2. anon/authenticated_security_definer_function_executable
--    PostgREST exposes every function in `public` as an RPC endpoint, and
--    EXECUTE is granted to PUBLIC by default. That makes these callable with
--    the anon key, which ships in the browser bundle.
--
-- This app has no Supabase Auth session -- all data access is server-side with
-- the service-role key (see src/hooks.server.ts, and the deny-all RLS in
-- 20260814_enable_rls_deny_all.sql). So anon/authenticated need EXECUTE on
-- nothing here; service_role retains it and is unaffected by the revokes.

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on every flagged function.
--
-- Signatures are read from pg_proc rather than written out literally. Several
-- of these functions take arguments (the linter only reports bare names, so a
-- hand-written `f()` list guesses wrong and fails with 42883), and a name can
-- be overloaded -- ALTER FUNCTION requires the exact argument list, so each
-- overload needs its own statement. Looping over the catalog handles both.
--
-- ALTER FUNCTION ... SET is used instead of rewriting each body with CREATE OR
-- REPLACE: most of these functions were created in the dashboard and their
-- source does not live in this repo, so rewriting them here would risk losing
-- logic. ALTER only attaches the setting and leaves the body untouched.
--
-- `pg_temp` is deliberately excluded from the path -- including it would leave
-- the same shadowing hole this is meant to close.
-- ---------------------------------------------------------------------------

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_default_epic',
        'check_dependency_cycle',
        'update_updated_at_column',
        'prevent_dependency_cycle',
        'create_profile_on_signup',
        'ensure_one_default_epic',
        'get_list_task_counts',
        'maybe_complete_task',
        'prevent_number_update',
        'sync_epic_user_id',
        'sync_issue_user_id'
      )
      -- Skip aggregates/window functions: ALTER FUNCTION rejects those.
      and p.prokind = 'f'
  loop
    execute format(
      'alter function %s set search_path = public, pg_catalog', fn.signature
    );
    raise notice 'pinned search_path on %', fn.signature;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Revoke EXECUTE from the PostgREST-exposed roles.
--
-- create_profile_on_signup is a trigger function; trigger execution does not
-- consult EXECUTE privileges, so revoking only removes the RPC endpoint and
-- leaves the trigger working. get_list_task_counts is called from
-- +layout.server.ts through the service-role client, which keeps EXECUTE.
--
-- Revoking from PUBLIC as well, since that is where the default grant lives --
-- revoking from anon/authenticated alone would leave the PUBLIC grant in place.
--
-- Catalog-driven for the same reason as above.
-- ---------------------------------------------------------------------------

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_profile_on_signup', 'get_list_task_counts')
      and p.prokind = 'f'
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      fn.signature
    );
    raise notice 'revoked execute on %', fn.signature;
  end loop;
end
$$;
