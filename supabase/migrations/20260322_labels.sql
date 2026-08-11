-- Labels (scoped to a list, shared among collaborators)
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, name)
);

-- Many-to-many join between tasks and labels
CREATE TABLE task_labels (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, label_id)
);

-- Indexes for common queries
CREATE INDEX idx_labels_list_id ON labels(list_id);
CREATE INDEX idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX idx_task_labels_label_id ON task_labels(label_id);

-- Disable RLS (consistent with rest of app)
ALTER TABLE labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels DISABLE ROW LEVEL SECURITY;
