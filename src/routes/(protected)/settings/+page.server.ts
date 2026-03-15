import { redirect, fail } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabase-admin.js';

import type { Actions } from './$types';

export const actions: Actions = {
  switchProfile: async ({ cookies }) => {
    cookies.delete('profile_id', { path: '/' });
    redirect(303, '/pick-profile');
  },

  updateProfile: async ({ request, locals }) => {
    const formData = await request.formData();
    const displayName = formData.get('display_name')?.toString().trim();

    if (!displayName) {
      return fail(400, { updateError: 'Display name cannot be empty' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', locals.profileId);

    if (error) {
      return fail(500, { updateError: 'Failed to update profile' });
    }

    return { updateSuccess: true };
  },

  uploadAvatar: async ({ request, locals }) => {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file || file.size === 0) {
      return fail(400, { avatarError: 'No file provided' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return fail(400, { avatarError: 'File must be JPEG, PNG, WebP, or GIF' });
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return fail(400, { avatarError: 'File must be under 5MB' });
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${locals.profileId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return fail(500, { avatarError: 'Failed to upload image' });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filename);

    // Append cache-bust timestamp so browsers fetch the new image after re-upload
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', locals.profileId);

    if (dbError) {
      return fail(500, { avatarError: 'Image uploaded but profile update failed' });
    }

    return { avatarSuccess: true };
  },
};
