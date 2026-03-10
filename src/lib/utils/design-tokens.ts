/**
 * North Design System - Design Tokens & Utilities
 *
 * Shared design tokens for visual consistency with NorthStar.
 * HomeBase uses the same design system as NorthStar.
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
