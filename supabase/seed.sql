-- Taskmaster Seed Data
-- ====================
-- Replace the user_id below with your actual Supabase auth user ID.
-- Find it in the Supabase Dashboard → Authentication → Users.
--
-- Run with: psql <connection_string> -f supabase/seed.sql
-- Safe to run multiple times (idempotent via ON CONFLICT DO NOTHING).

DO $$
DECLARE
  -- !! REPLACE THIS with your auth.users ID !!
  seed_user_id uuid := '00000000-0000-0000-0000-000000000000';

  -- Fixed UUIDs for idempotency
  work_list    uuid := 'a0000001-0000-0000-0000-000000000001';
  personal_list uuid := 'a0000001-0000-0000-0000-000000000002';
  shopping_list uuid := 'a0000001-0000-0000-0000-000000000003';

  task_overdue  uuid := 'b0000001-0000-0000-0000-000000000001';
  task_today    uuid := 'b0000001-0000-0000-0000-000000000002';
  task_upcoming uuid := 'b0000001-0000-0000-0000-000000000003';
  task_inbox    uuid := 'b0000001-0000-0000-0000-000000000004';
  task_recurring uuid := 'b0000001-0000-0000-0000-000000000005';
  task_done     uuid := 'b0000001-0000-0000-0000-000000000006';
  task_urgent   uuid := 'b0000001-0000-0000-0000-000000000007';
  task_shopping1 uuid := 'b0000001-0000-0000-0000-000000000008';

  cl_item1 uuid := 'c0000001-0000-0000-0000-000000000001';
  cl_item2 uuid := 'c0000001-0000-0000-0000-000000000002';
  cl_item3 uuid := 'c0000001-0000-0000-0000-000000000003';
BEGIN

  -- Ensure profile exists for seed user
  INSERT INTO profiles (id, email, display_name, timezone)
  VALUES (seed_user_id, 'seed@example.com', 'Seed User', 'America/New_York')
  ON CONFLICT (id) DO NOTHING;

  -- Task lists
  INSERT INTO task_lists (id, name, color, owner_id, sort_order) VALUES
    (work_list,     'Work',     '#3B82F6', seed_user_id, 0),
    (personal_list, 'Personal', '#22C55E', seed_user_id, 1),
    (shopping_list, 'Shopping', '#F97316', seed_user_id, 2)
  ON CONFLICT (id) DO NOTHING;

  -- Owner membership rows
  INSERT INTO task_list_members (list_id, user_id, role) VALUES
    (work_list,     seed_user_id, 'owner'),
    (personal_list, seed_user_id, 'owner'),
    (shopping_list, seed_user_id, 'owner')
  ON CONFLICT (list_id, user_id) DO NOTHING;

  -- Tasks
  -- 1. Overdue work task (shows in Today → Overdue)
  INSERT INTO tasks (id, owner_id, list_id, title, notes, status, priority, due_at, is_recurring, sort_order)
  VALUES (task_overdue, seed_user_id, work_list, 'Review Q1 report',
          'Check the numbers on slide 3', 'todo', 2,
          (now() - interval '2 days'), false, 0)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Due today personal task with checklist (shows in Today → Due Today)
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, due_at, is_recurring, sort_order)
  VALUES (task_today, seed_user_id, personal_list, 'Prepare for trip',
          'todo', 3, now()::date + interval '12 hours', false, 0)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Upcoming task (shows in Upcoming, due in 3 days)
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, due_at, is_recurring, sort_order)
  VALUES (task_upcoming, seed_user_id, work_list, 'Submit expense report',
          'todo', 3, (now() + interval '3 days'), false, 1)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Inbox task (no list, no due date)
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, is_recurring, sort_order)
  VALUES (task_inbox, seed_user_id, NULL, 'Look into new project management tools',
          'todo', 4, false, 0)
  ON CONFLICT (id) DO NOTHING;

  -- 5. Recurring weekly task (Mon/Wed/Fri)
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, due_at, is_recurring, recurrence_rule, sort_order)
  VALUES (task_recurring, seed_user_id, personal_list, 'Go for a run',
          'todo', 3, (now() + interval '1 day'),
          true,
          '{"frequency": "weekly", "interval": 1, "byweekday": [0, 2, 4], "time_of_day": "07:00", "ends": {"type": "never"}}'::jsonb,
          1)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Completed task
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, due_at, completed_at, is_recurring, sort_order)
  VALUES (task_done, seed_user_id, work_list, 'Set up CI pipeline',
          'done', 2, (now() - interval '5 days'), (now() - interval '4 days'), false, 2)
  ON CONFLICT (id) DO NOTHING;

  -- 7. Urgent task (priority 1)
  INSERT INTO tasks (id, owner_id, list_id, title, notes, status, priority, due_at, is_recurring, sort_order)
  VALUES (task_urgent, seed_user_id, work_list, 'Fix production bug #42',
          'Users seeing 500 on the dashboard endpoint', 'in_progress', 1,
          now()::date + interval '18 hours', false, 3)
  ON CONFLICT (id) DO NOTHING;

  -- 8. Shopping list task
  INSERT INTO tasks (id, owner_id, list_id, title, status, priority, is_recurring, sort_order)
  VALUES (task_shopping1, seed_user_id, shopping_list, 'Weekly groceries',
          'todo', 4, false, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Checklist items for "Prepare for trip" (2 of 3 completed → shows progress badge)
  INSERT INTO checklist_items (id, task_id, label, is_completed, position) VALUES
    (cl_item1, task_today, 'Book flights',        true,  0),
    (cl_item2, task_today, 'Reserve hotel',        true,  1),
    (cl_item3, task_today, 'Pack luggage',         false, 2)
  ON CONFLICT (id) DO NOTHING;

END $$;
