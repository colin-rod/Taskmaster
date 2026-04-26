-- Add archived_at column to task_lists for soft-archiving lists
ALTER TABLE task_lists ADD COLUMN archived_at timestamptz;
