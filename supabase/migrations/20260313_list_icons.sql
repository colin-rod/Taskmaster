-- Add icon column to task_lists
ALTER TABLE task_lists ADD COLUMN icon text NOT NULL DEFAULT 'list';
