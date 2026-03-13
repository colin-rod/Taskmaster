import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  createTask: async ({ request, locals: { supabase, profileId } }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const due_at = formData.get('due_at')?.toString() || null;
    const referer = request.headers.get('referer') ?? '/today';

    if (!title) return fail(400, { error: 'Task title is required' });

    const { error } = await supabase.from('tasks').insert({
      title,
      list_id: null,
      owner_id: profileId!,
      due_at,
      status: 'todo',
      priority: 4,
    });

    if (error) return fail(500, { error: error.message });

    redirect(303, referer);
  }
};
