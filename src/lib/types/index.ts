// =============================================================================
// Taskmaster Types
// =============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled';
export type TaskPriority = 1 | 2 | 3 | 4;
export type ListRole = 'owner' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  avatar_color: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface TaskList {
  id: string;
  name: string;
  color: string | null;
  icon: string;
  owner_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  members?: TaskListMember[];
}

export interface TaskListMember {
  list_id: string;
  user_id: string;
  role: ListRole;
  // Relations
  profile?: Profile;
}

export interface Task {
  id: string;
  owner_id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  reminder_at: string | null;
  timezone: string | null;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  last_completed_at: string | null;
  completed_at: string | null;
  assigned_to_user_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  list?: TaskList;
  checklist_items?: ChecklistItem[];
  assignee?: Profile;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  label: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  byweekday?: number[]; // 0=Mon..6=Sun
  time_of_day?: string; // "HH:MM"
  schedule_type?: 'due_date' | 'completion_date'; // defaults to 'due_date'
  ends?:
    | { type: 'never' }
    | { type: 'on_date'; date: string }
    | { type: 'after_n_occurrences'; count: number; occurrences_completed: number };
}

export interface Notification {
  id: string;
  user_id: string;
  task_id: string | null;
  type: 'reminder' | 'due' | 'assigned';
  scheduled_at: string | null;
  delivered_at: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SearchResult {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  list: { name: string; color: string | null } | null;
}

// List colors for the color picker
export const LIST_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
] as const;
