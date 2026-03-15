import type { Task } from '$lib/types/index.js';

export function groupByDay(tasks: Task[]): { label: string; isoDate: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.due_at) continue;
    const isoDate = task.due_at.slice(0, 10);
    const existing = groups.get(isoDate);
    if (existing) {
      existing.push(task);
    } else {
      groups.set(isoDate, [task]);
    }
  }

  return Array.from(groups.entries()).map(([isoDate, tasks]) => ({
    isoDate,
    label: new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }),
    tasks,
  }));
}
