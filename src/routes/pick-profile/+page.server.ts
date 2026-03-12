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
    .select('id, display_name, email, avatar_color')
    .order('display_name', { ascending: true });

  return { profiles: profiles ?? [] };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
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
};
