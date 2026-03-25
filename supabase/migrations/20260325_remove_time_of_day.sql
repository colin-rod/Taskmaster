-- Normalize due_at to midnight UTC
UPDATE tasks
SET due_at = date_trunc('day', due_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
WHERE due_at IS NOT NULL;

-- Normalize reminder_at to midnight UTC
UPDATE tasks
SET reminder_at = date_trunc('day', reminder_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
WHERE reminder_at IS NOT NULL;

-- Null out time block fields
UPDATE tasks
SET start_at = NULL, duration_minutes = NULL
WHERE start_at IS NOT NULL OR duration_minutes IS NOT NULL;

-- Remove time_of_day from recurrence_rule JSON
UPDATE tasks
SET recurrence_rule = recurrence_rule - 'time_of_day'
WHERE recurrence_rule IS NOT NULL
  AND recurrence_rule ? 'time_of_day';
