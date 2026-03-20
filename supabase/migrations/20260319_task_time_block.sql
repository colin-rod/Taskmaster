-- Add time-block scheduling columns to tasks
ALTER TABLE tasks
  ADD COLUMN start_at timestamptz,
  ADD COLUMN duration_minutes integer;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_duration_minutes_positive
    CHECK (duration_minutes IS NULL OR duration_minutes > 0);
