-- Allow labels without a list (personal/inbox labels)
ALTER TABLE labels ALTER COLUMN list_id DROP NOT NULL;

-- Replace the single unique constraint with two partial indexes
ALTER TABLE labels DROP CONSTRAINT labels_list_id_name_key;

-- Per-list uniqueness (existing behavior)
CREATE UNIQUE INDEX idx_labels_list_name ON labels(list_id, name) WHERE list_id IS NOT NULL;

-- Per-user uniqueness for personal labels
CREATE UNIQUE INDEX idx_labels_user_name ON labels(created_by, name) WHERE list_id IS NULL;

-- Index for fetching personal labels efficiently
CREATE INDEX idx_labels_personal ON labels(created_by) WHERE list_id IS NULL;
