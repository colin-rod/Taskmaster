import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { label_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.label_id) {
    return json({ error: 'label_id is required' }, { status: 400 });
  }

  const { error } = await locals.supabase
    .from('task_labels')
    .insert({ task_id: params.id, label_id: body.label_id });

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { label_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.label_id) {
    return json({ error: 'label_id is required' }, { status: 400 });
  }

  const { error } = await locals.supabase
    .from('task_labels')
    .delete()
    .eq('task_id', params.id)
    .eq('label_id', body.label_id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
};
