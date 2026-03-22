-- Re-point assigned_to FK from auth.users to profiles (matches the remove_auth pattern)
ALTER TABLE tasks DROP CONSTRAINT tasks_assigned_to_user_id_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_user_id_fkey
  FOREIGN KEY (assigned_to_user_id) REFERENCES profiles(id);
