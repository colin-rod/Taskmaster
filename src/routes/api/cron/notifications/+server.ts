import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getSupabaseAdmin } from '$lib/server/supabase-admin.js';
import webPush from 'web-push';

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  webPush.setVapidDetails(env.VAPID_SUBJECT!, publicEnv.PUBLIC_VAPID_KEY!, env.VAPID_PRIVATE_KEY!);
  const supabaseAdmin = getSupabaseAdmin();

  const now = new Date().toISOString();

  // Fetch tasks with due reminders that haven't been completed
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, reminder_at, assigned_to_user_id, owner_id')
    .lte('reminder_at', now)
    .not('reminder_at', 'is', null)
    .neq('status', 'done')
    .neq('status', 'canceled');

  if (!tasks || tasks.length === 0) {
    return json({ sent: 0 });
  }

  let sentCount = 0;

  for (const task of tasks) {
    // Idempotency: skip if notification already exists for this reminder
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('task_id', task.id)
      .eq('type', 'reminder')
      .eq('scheduled_at', task.reminder_at)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Determine recipient: assigned_to if set, else owner
    const userId = task.assigned_to_user_id || task.owner_id;

    // Insert notification row before sending push (idempotency guard)
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      task_id: task.id,
      type: 'reminder',
      scheduled_at: task.reminder_at,
      delivered_at: now,
      is_read: false,
    });

    // Fetch user's push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', userId);

    if (subscriptions) {
      for (const sub of subscriptions) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
            },
            JSON.stringify({
              title: 'Reminder',
              body: task.title,
              url: '/today',
            })
          );
          sentCount++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired — clean up
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        }
      }
    }
  }

  return json({ sent: sentCount });
};
