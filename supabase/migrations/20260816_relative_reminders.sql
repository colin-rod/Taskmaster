-- Relative reminders: "day before", "week before", etc.
--
-- Until now a reminder was a single absolute timestamp in tasks.reminder_at,
-- written once at the moment the user picked it. That is wrong for reminders
-- expressed relative to the due date: if the due date later moves -- and on a
-- recurring task it moves on every completion -- the stored timestamp stays
-- behind and fires against a date that no longer means anything.
--
-- So a relative reminder stores the *offset* instead, and the notification cron
-- resolves due_at - offset at send time. The reminder then tracks the due date
-- for free, including across recurrences.
--
-- reminder_at is kept, not replaced. The two are mutually exclusive per task:
--   reminder_offset_minutes set -> relative, resolved against due_at
--   reminder_at set             -> absolute, fires at that instant
-- Existing rows keep working untouched; nothing is backfilled, because an
-- absolute reminder carries no information about which offset the user meant.

alter table public.tasks
  add column if not exists reminder_offset_minutes integer;

comment on column public.tasks.reminder_offset_minutes is
  'Minutes before due_at to fire the reminder (0 = on the due date). Resolved at '
  'send time by the notification cron, so it follows due_at when that changes. '
  'Mutually exclusive with reminder_at; requires due_at to be set.';

-- Guard the invariants the cron relies on, so a bad write fails loudly here
-- rather than silently producing a reminder that never fires.
--
-- Upper bound is 1 year in minutes: an offset larger than that is a unit
-- mix-up (days or seconds passed where minutes were expected), not a real
-- reminder anyone set.
alter table public.tasks
  drop constraint if exists tasks_reminder_offset_valid;

alter table public.tasks
  add constraint tasks_reminder_offset_valid check (
    reminder_offset_minutes is null
    or (
      reminder_offset_minutes >= 0
      and reminder_offset_minutes <= 527040
      and due_at is not null
      and reminder_at is null
    )
  );

-- The cron scans for tasks whose resolved reminder time has passed, which means
-- filtering on due_at against a moving window rather than on an indexed
-- reminder_at. This partial index keeps that scan to just the rows that have a
-- relative reminder at all.
create index if not exists idx_tasks_reminder_offset
  on public.tasks (due_at)
  where reminder_offset_minutes is not null;
