import { invalidateAll } from '$app/navigation';
import { toast } from 'svelte-sonner';

export async function patchTask(
  taskId: string,
  fields: Record<string, unknown>,
  errorMessage = 'Failed to update task'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      toast.error(errorMessage);
      return false;
    }
    await invalidateAll();
    return true;
  } catch {
    toast.error(errorMessage);
    return false;
  }
}
