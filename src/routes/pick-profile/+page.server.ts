import { redirect, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // If already picked a profile, validate and redirect
  if (locals.profileId) {
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('id')
      .eq('id', locals.profileId)
      .single();

    if (profile) {
      redirect(303, '/today');
    }
  }

  const { data: profiles } = await locals.supabase
    .from('profiles')
    .select('id, display_name, email, avatar_color, avatar_url')
    .order('display_name', { ascending: true });

  return { profiles: profiles ?? [] };
};

export const actions: Actions = {
  select: async ({ request, cookies }) => {
    const formData = await request.formData();
    const profileId = formData.get('profile_id')?.toString();

    if (!profileId) {
      return fail(400, { error: 'Please select a profile' });
    }

    cookies.set('profile_id', profileId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect(303, '/today');
  },

  create: async ({ request, cookies, locals }) => {
    const formData = await request.formData();
    const displayName = formData.get('display_name')?.toString().trim();

    if (!displayName) {
      return fail(400, { createError: 'Name is required' });
    }

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const { data: profile, error } = await locals.supabase
      .from('profiles')
      .insert({ display_name: displayName, avatar_color: avatarColor })
      .select('id')
      .single();

    if (error || !profile) {
      return fail(500, { createError: 'Failed to create profile' });
    }

    cookies.set('profile_id', profile.id, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect(303, '/today');
  },
};
