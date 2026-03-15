import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const profileId = cookies.get('profile_id');
  redirect(303, profileId ? '/today' : '/pick-profile');
};
