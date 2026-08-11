import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; color?: string; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return json({ error: 'Name must be a non-empty string' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if (body.color !== undefined) {
    updates.color = body.color;
  }
  if (body.sort_order !== undefined) {
    updates.sort_order = body.sort_order;
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await locals.supabase
    .from('labels')
    .update(updates)
    .eq('id', params.id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await locals.supabase
    .from('labels')
    .delete()
    .eq('id', params.id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
};
