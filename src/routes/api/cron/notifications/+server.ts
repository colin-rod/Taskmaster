import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getSupabaseAdmin } from '$lib/server/supabase-admin.js';
import { resolveReminderAt } from '$lib/utils/reminders.js';
import webPush from 'web-push';

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  webPush.setVapidDetails(env.VAPID_SUBJECT!, publicEnv.PUBLIC_VAPID_KEY!, env.VAPID_PRIVATE_KEY!);
  const supabaseAdmin = getSupabaseAdmin();

  const now = new Date().toISOString();

  // Reminders come in two kinds and are collected separately.
  //
  // Absolute (reminder_at): the stored instant is the send time, so the
  // due-now filter is a plain column comparison.
  const { data: absoluteTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, reminder_at, assigned_to_user_id, owner_id')
    .lte('reminder_at', now)
    .not('reminder_at', 'is', null)
    .neq('status', 'done')
    .neq('status', 'canceled');

  // Relative (reminder_offset_minutes): the send time is due_at minus the
  // offset, which Postgres can't filter on through PostgREST without a
  // generated column. Instead fetch the candidates whose due date is near
  // enough that their offset could have elapsed, then resolve in JS below.
  // The window is the largest offset the constraint allows (1 year), bounded
  // on the far side so long-past due dates don't accumulate in the scan.
  const horizon = new Date();
  horizon.setUTCFullYear(horizon.getUTCFullYear() + 1);

  const { data: relativeCandidates } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_at, reminder_offset_minutes, assigned_to_user_id, owner_id')
    .not('reminder_offset_minutes', 'is', null)
    .not('due_at', 'is', null)
    .lte('due_at', horizon.toISOString())
    .neq('status', 'done')
    .neq('status', 'canceled');

  // Normalise both kinds to {task, scheduledAt} so the delivery loop below
  // doesn't care which kind it's sending.
  const pending: { task: { id: string; title: string; assigned_to_user_id: string | null; owner_id: string }; scheduledAt: string }[] = [];

  for (const task of absoluteTasks ?? []) {
    pending.push({ task, scheduledAt: task.reminder_at });
  }

  for (const task of relativeCandidates ?? []) {
    const at = resolveReminderAt(task.due_at, task.reminder_offset_minutes);
    if (!at) continue;
    if (at.toISOString() > now) continue; // not due yet
    pending.push({ task, scheduledAt: at.toISOString() });
  }

  if (pending.length === 0) {
    return json({ sent: 0 });
  }

  let sentCount = 0;

  for (const { task, scheduledAt } of pending) {
    // Idempotency: skip if a notification already exists for this reminder.
    // For relative reminders scheduledAt is derived from due_at, so moving the
    // due date yields a new key and correctly re-arms the reminder.
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('task_id', task.id)
      .eq('type', 'reminder')
      .eq('scheduled_at', scheduledAt)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Determine recipient: assigned_to if set, else owner
    const userId = task.assigned_to_user_id || task.owner_id;

    // Insert notification row before sending push (idempotency guard)
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      task_id: task.id,
      type: 'reminder',
      scheduled_at: scheduledAt,
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
