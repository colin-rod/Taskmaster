import { json } from '@sveltejs/kit';
import { LABEL_COLORS } from '$lib/types/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.profileId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const listId = url.searchParams.get('list_id');

  let query = locals.supabase
    .from('labels')
    .select('*')
    .order('sort_order', { ascending: true });

  if (listId) {
    query = query.eq('list_id', listId);
  } else {
    query = query.is('list_id', null).eq('created_by', locals.profileId);
  }

  const { data: labels, error } = await query;

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

  if (!name?.trim()) {
    return json({ error: 'name is required' }, { status: 400 });
  }

  // Auto-assign color if not provided
  let finalColor = color;
  if (!finalColor) {
    let colorQuery = locals.supabase.from('labels').select('color');
    if (list_id) {
      colorQuery = colorQuery.eq('list_id', list_id);
    } else {
      colorQuery = colorQuery.is('list_id', null).eq('created_by', locals.profileId);
    }
    const { data: existing } = await colorQuery;

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
      list_id: list_id ?? null,
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
