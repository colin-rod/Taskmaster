# Taskmaster — agent notes

Household task manager: SvelteKit 2 + Svelte 5 (runes), Supabase (Postgres),
Tailwind v4, bits-ui primitives, deployed on Vercel. Dev server runs on port
**5174**.

## Things that aren't obvious from the code

- **There is no Supabase Auth.** `20260312_remove_auth.sql` removed it. Users
  pick a profile at `/pick-profile`, which sets a `profile_id` cookie;
  `src/hooks.server.ts` puts it on `locals.profileId`. The README and
  `docs/qa/manual-qa-checklist.md` still describe email/password login — they
  are stale.
- **All data access is server-side via the service-role client**
  (`locals.supabase` = `getSupabaseAdmin()`). RLS is enabled with **no
  policies** (`20260814_enable_rls_deny_all.sql`) so the public anon key can't
  read anything. Never query Supabase from the browser, and never disable RLS
  again — if a client ever needs direct access, write real policies.
- **Task visibility is enforced in the queries, not in RLS.** A profile can see
  a task if it owns it, is assigned to it, or `tasks.is_shared` is true
  (`20261002_task_sharing.sql`). Every tasks read goes through `visibleTo()` and
  every write through `getAccessibleTask()` in
  `src/lib/server/task-visibility.ts` — a new tasks query without one of them
  leaks private tasks to the other profiles. Lists are separately scoped to
  their `task_list_members`. The profile picker is still unauthenticated, so
  this is privacy between cooperating household members, not security.
- **Reminders** are either absolute (`tasks.reminder_at`) or relative
  (`reminder_offset_minutes`, resolved against `due_at` at send time by the
  cron). The two are mutually exclusive per task. Logic lives in
  `src/lib/utils/reminders.ts`.
- **Reminder cron** is a GitHub Actions workflow
  (`.github/workflows/reminder-cron.yml`, every 5 min) hitting
  `/api/cron/notifications` with `CRON_SECRET` — not a Vercel cron (Hobby plan).
- **"Today" is the user's local date, not the UTC date.** Due dates are
  calendar dates stored as midnight UTC, so compare them as `YYYY-MM-DD` keys
  with the helpers in `src/lib/utils/dates.ts` (`todayKey`, `daysFromToday`,
  `dateKeyToIso`). In the browser they use the device clock; on the server pass
  `locals.timeZone`, which comes from the `tz` cookie the protected layout
  sets. Don't derive "today" from `new Date()` + `setHours`/`toISOString` —
  the server runs in UTC.
- **Recurrence** engine is `src/lib/utils/recurrence.ts`; completing a
  recurring task rolls it forward.
- Smart-view nav items are defined once in `src/lib/config/nav.ts` and shared by
  the Sidebar and the mobile More page.
- Migrations are plain SQL files in `supabase/migrations/`, named
  `YYYYMMDD_description.sql`. Put the "why" in a header comment like the
  recent ones do.
- CI (`.github/workflows/ci.yml`) uses **pnpm** with `pnpm-lock.yaml`; a
  `package-lock.json` also exists. Keep `pnpm-lock.yaml` in sync when changing
  dependencies.

## Checks

Before calling work done, run: `npm run lint`, `npm run check`, `npm run test`
(Vitest), and `npm run build` for anything non-trivial. Unit tests sit next to
the code (`*.test.ts`).

# Project plan upkeep

`PROJECT_PLAN.md` (repo root) is the living backlog — outstanding / upcoming /
ideas / future / recently-done. Keep it current **as part of doing the work**,
in the same change, not as a separate chore:

- When you start a substantial item, move it into **Outstanding / In progress**.
- When you finish, check it off and move it to **Recently done** with the date
  (prune the list to roughly the last 10).
- When the user raises a new idea or future item, add it to the right section.
- Update the `_Last updated_` date whenever you edit the file.

Detailed multi-step feature designs still go in a dated `docs/plans/*.md`; the
board just links to them so it stays scannable.
