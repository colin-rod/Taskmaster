-- =============================================================================
-- Backfill: ensure every list owner has a task_list_members row
-- =============================================================================

INSERT INTO task_list_members (list_id, user_id, role)
SELECT id, owner_id, 'owner' FROM task_lists
ON CONFLICT (list_id, user_id) DO NOTHING;
