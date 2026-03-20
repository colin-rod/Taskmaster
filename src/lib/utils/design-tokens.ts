/**
 * North Design System - Design Tokens & Utilities
 *
 * Shared design tokens for visual consistency with NorthStar.
 * Taskmaster uses the same design system as NorthStar.
 */

/**
 * Task Status Colors
 */
export const taskStatusColors = {
  todo: 'status-todo',
  in_progress: 'status-doing',
  done: 'status-done',
  canceled: 'status-canceled',
} as const;

export type TaskStatus = keyof typeof taskStatusColors;

/**
 * Get status color class for a given task status
 */
export function getTaskStatusColor(status: string): string {
  return taskStatusColors[status as TaskStatus] || taskStatusColors.todo;
}

/**
 * Task Priority (1=highest, 4=lowest — opposite of NorthStar's 0=highest)
 */
export const priorityLabels = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
} as const;

export type Priority = 1 | 2 | 3 | 4;

export function getPriorityLabel(priority: number): string {
  return priorityLabels[priority as Priority] || 'P4';
}

/**
 * Format a status value for display (e.g. 'in_progress' → 'In Progress')
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Spacing Scale (based on 4px grid)
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

/**
 * Border Radius
 */
export const borderRadius = {
  sm: '6px',
  md: '10px',
  lg: '20px',
} as const;

/**
 * Typography Scale
 */
export const typography = {
  pageTitle: 'text-page-title font-accent',
  sectionHeader: 'text-section-header font-accent',
  body: 'text-body font-ui',
  metadata: 'text-metadata',
} as const;

/**
 * Animation Durations
 */
export const duration = {
  fast: '150ms',
  drawer: '250ms',
  slow: '300ms',
} as const;

/**
 * Shadow Levels
 */
export const shadows = {
  level1: 'shadow-level-1',
  level2: 'shadow-level-2',
} as const;

/**
 * Priority Options
 */
export const PRIORITY_OPTIONS = [
  { level: 1, label: 'P1', desc: 'Urgent', color: 'text-destructive',     bg: 'bg-destructive/10',  selectClass: 'select-priority-1' },
  { level: 2, label: 'P2', desc: 'High',   color: 'text-orange-500',       bg: 'bg-orange-500/10',   selectClass: 'select-priority-2' },
  { level: 3, label: 'P3', desc: 'Medium', color: 'text-blue-500',         bg: 'bg-blue-500/10',     selectClass: 'select-priority-3' },
  { level: 4, label: 'P4', desc: 'Low',    color: 'text-foreground-muted', bg: 'bg-surface-subtle',  selectClass: 'select-priority-4' },
] as const;

/**
 * Status Options
 */
export const STATUS_OPTIONS = [
  { value: 'todo',        label: 'Todo',        selectClass: 'select-status-todo',     dotColor: 'bg-status-todo' },
  { value: 'in_progress', label: 'In Progress', selectClass: 'select-status-doing',    dotColor: 'bg-status-doing' },
  { value: 'done',        label: 'Done',        selectClass: 'select-status-done',     dotColor: 'bg-status-done' },
  { value: 'canceled',    label: 'Canceled',    selectClass: 'select-status-canceled', dotColor: 'bg-status-canceled' },
] as const;

/**
 * Returns a CSS class name for due-date urgency coloring.
 */
export function getDueDateClass(due_at: string | null | undefined): string {
  if (!due_at) return '';
  const diff = (new Date(due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0)  return 'due-overdue';
  if (diff < 1)  return 'due-today';
  if (diff <= 3) return 'due-soon';
  return '';
}
