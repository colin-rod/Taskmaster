import { redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
  switchProfile: async ({ cookies }) => {
    cookies.delete('profile_id', { path: '/' });
    redirect(303, '/pick-profile');
  },
};
