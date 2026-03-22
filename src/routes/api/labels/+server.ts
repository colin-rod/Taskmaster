import { json } from '@sveltejs/kit';
import { LABEL_COLORS } from '$lib/types/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const listId = url.searchParams.get('list_id');
  if (!listId) {
    return json({ error: 'list_id is required' }, { status: 400 });
  }

  const { data: labels, error } = await locals.supabase
    .from('labels')
    .select('*')
    .eq('list_id', listId)
    .order('sort_order', { ascending: true });

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ labels: labels ?? [] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { list_id?: string; name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { list_id, name, color } = body;

  if (!list_id || !name?.trim()) {
    return json({ error: 'list_id and name are required' }, { status: 400 });
  }

  // Auto-assign color if not provided
  let finalColor = color;
  if (!finalColor) {
    const { data: existing } = await locals.supabase
      .from('labels')
      .select('color')
      .eq('list_id', list_id);

    const usedCounts = new Map<string, number>();
    for (const c of LABEL_COLORS) {
      usedCounts.set(c, 0);
    }
    for (const row of existing ?? []) {
      const count = usedCounts.get(row.color) ?? 0;
      usedCounts.set(row.color, count + 1);
    }

    let minCount = Infinity;
    finalColor = LABEL_COLORS[0];
    for (const [c, count] of usedCounts) {
      if (count < minCount) {
        minCount = count;
        finalColor = c;
      }
    }
  }

  const { data: label, error } = await locals.supabase
    .from('labels')
    .insert({
      list_id,
      name: name.trim(),
      color: finalColor,
      created_by: locals.profileId,
    })
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ label }, { status: 201 });
};
