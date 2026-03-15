-- Remove Supabase Auth dependency: make profiles standalone, re-point FKs, disable RLS

-- 1. Detach profiles from auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Re-point FKs from auth.users to profiles
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_owner_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE task_lists DROP CONSTRAINT IF EXISTS task_lists_owner_id_fkey;
ALTER TABLE task_lists ADD CONSTRAINT task_lists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 3. Disable RLS on all app tables (household app, no security needed)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_list_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items DISABLE ROW LEVEL SECURITY;

-- Drop the push_subscriptions RLS policy
DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;

-- 4. Add avatar_color for profile picker UI
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#3B82F6';
