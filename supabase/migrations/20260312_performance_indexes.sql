-- Performance indexes for Taskmaster smart views and common query patterns
-- M7 Issue 8.2

-- Today + Upcoming views: filter by due_at range, exclude done/canceled
CREATE INDEX IF NOT EXISTS idx_tasks_due_status
  ON tasks (due_at, status)
  WHERE status NOT IN ('done', 'canceled');

-- List detail view: filter by list_id, sort/filter by due_at and status
CREATE INDEX IF NOT EXISTS idx_tasks_list_due_status
  ON tasks (list_id, due_at, status);

-- Assigned to Me view: filter by assignee, order by due_at
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due
  ON tasks (assigned_to_user_id, due_at)
  WHERE assigned_to_user_id IS NOT NULL;

-- Inbox view: tasks with no list, excluding completed
CREATE INDEX IF NOT EXISTS idx_tasks_inbox
  ON tasks (list_id, created_at DESC)
  WHERE list_id IS NULL AND status NOT IN ('done', 'canceled');

-- Recurring task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_recurring
  ON tasks (is_recurring)
  WHERE is_recurring = true;

-- Cron notification delivery: filter by reminder_at, exclude done/canceled
CREATE INDEX IF NOT EXISTS idx_tasks_reminder
  ON tasks (reminder_at)
  WHERE reminder_at IS NOT NULL AND status NOT IN ('done', 'canceled');

-- Checklist items: fetch by task with position ordering
CREATE INDEX IF NOT EXISTS idx_checklist_items_task
  ON checklist_items (task_id, position);

-- Unread notification count (runs on every protected page load)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- Role map lookups for shared list permission checks
CREATE INDEX IF NOT EXISTS idx_task_list_members_user
  ON task_list_members (user_id, list_id);
