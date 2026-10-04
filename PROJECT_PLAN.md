# Project Plan — Taskmaster

> **Living backlog.** Claude keeps this current as work progresses (see the
> "Project plan upkeep" rule in `AGENTS.md`). For detailed, one-off feature
> designs see `docs/plans/`.
>
> **Conventions:** checkboxes `- [ ]` for actionable items, plain bullets for
> ideas/future. Items move *down* the sections as they progress
> (Idea → Upcoming → Outstanding → Done) rather than being rewritten. Link to a
> `docs/plans/*.md` when one exists so this file stays scannable.

_Last updated: 2026-10-04_

---

## 🔴 Outstanding / In progress

- [ ] **Apply `20261002_task_sharing.sql` to the Supabase project** before
  deploying the sharing code — the app now selects `tasks.is_shared` and calls
  `get_list_task_counts(p_profile_id)`, so it fails without the migration. Then
  run the two-profile and responsive checks in
  [docs/plans/2026-10-02-task-sharing.md](docs/plans/2026-10-02-task-sharing.md)
  (not yet done against a live database).

## 🟡 Upcoming (next up)

- [ ] **Refresh stale docs.** `README.md` still describes Supabase Auth
  (sign-up/login, `ORIGIN` for auth redirects, seed `user_id` from
  Authentication → Users), the removed Upcoming view, and `(public)/auth`
  routes. `docs/qa/manual-qa-checklist.md` §1 tests email/password login. Update
  both for the profile-picker model and current views (Today, Overdue, Inbox,
  Assigned, Calendar, Completed).
- [ ] **Branch hygiene.** `main` is 10 commits ahead of `development`, but the
  README says the default branch should be `development` so the reminder cron
  workflow runs from it. Decide which branch is canonical, sync the other, and
  fix the README.

## 💡 Ideas (unscheduled, not yet committed)

- **Packing list** — `origin/claude/add-packing-list-feature-bOyHj` (2026-05-09)
  only adds a packing list to seed data; unmerged. Decide whether it should
  become a real feature (list templates?) or be deleted.
- add task button popup shows up full width on desktop
- Create calender feed so that tasks can be seen in other calenar apps.
- on calender view allow pinch to zoom on web,mobile and double click to zoom on desktop
- change reminders to be relative to due date in additon to absolute (like current)
- move dark mode button from navbar to settings
- Allow to select multiple priorties or dates on the buttons in then sort and filter section
- Add a section on the right panel to view 
- switch backend from supabase to different hosting


## 🔮 Future work (known, deferred)

- **Real authentication for profiles.** Sharing (2026-10-02) is privacy by
  courtesy: the picker is unauthenticated and the cookie is a bare profile id,
  so either person can switch profile. A per-profile PIN with a signed session
  cookie, or Supabase Auth, would make private tasks actually private without
  changing the visibility rule.
- **Assign shared tasks outside a joint list.** Assignment still requires both
  people to be members of the task's list.
- **Reminders for shared tasks** go to the assignee, else the owner only. Decide
  whether a shared, unassigned task should notify everyone.

## ✅ Recently done (rolling, last ~10)

- [x] **"Today" is the local date everywhere (2026-10-04)** — the browser
  reports its time zone in a `tz` cookie (`locals.timeZone`), and the sidebar
  counts, Today / Overdue views, calendar, due filters, due-date colours,
  Today/Tomorrow labels, quick-date buttons and completion-based recurrence all
  compare a task's stored date against the local date instead of the UTC one.
  Also fixes a task due today being coloured "overdue", and calendar cells
  being a day off east of UTC. Helpers and tests in `src/lib/utils/dates.ts`.
  Reminder send times are unchanged (still a fixed UTC hour).
- [x] **Fixed due-date save from the task sheet (2026-10-04)** — the sheet kept
  `YYYY-MM-DD` and appended a time suffix, but the date picker writes back a
  full ISO string, so the PATCH sent a doubled suffix and Postgres rejected
  `NaN-NaN-NaN…`. The sheet now holds the ISO string, and
  `PATCH /api/tasks/[id]` rejects an unparseable `due_at` with a 400. The
  picker's custom date field also reads the UTC date now, so it no longer shows
  the previous day west of UTC.
- [x] **Years on task dates (2026-10-02)** — `formatDateOnly` now includes the
  year ("Fri, Oct 9, 2026"), so Inbox and every other task row, the date picker
  trigger and reminder labels show it. "Today" / "Tomorrow" are unchanged.
- [x] **Private and shared tasks for a second person (2026-10-02)** — per-task
  `is_shared` flag; every view, count, search and write scoped to "owner,
  assignee, or shared"; lists scoped to their members; share toggle in the task
  sheet, row menu and Quick Add; member picker by household profile instead of
  email. Design: [docs/plans/2026-10-02-task-sharing.md](docs/plans/2026-10-02-task-sharing.md).
  Code is in; the migration still has to be applied (see Outstanding).
- [x] **Relative reminders (2026-08-13)** — "day before", "week before", etc.
  stored as `reminder_offset_minutes` and resolved against `due_at` at send
  time, so they follow the due date across edits and recurrences. Absolute
  `reminder_at` kept; the two are mutually exclusive.
- [x] **RLS deny-all + function hardening (2026-08-13)** — RLS re-enabled on all
  public tables with no policies (service-role bypasses it); addressed Supabase
  security-linter warnings on functions.
- [x] **Completed view sorting & filtering (2026-08-13)**
- [x] **Removed the Upcoming view (2026-08-13)**
- [x] **TaskSheet / layout icon + styling pass (2026-08-13)**
- [x] **Clean & Vibrant redesign, Phases 1–7 (merged 2026-08-11)** — new design
  tokens, simplified TaskRow, unified Quick Add + global `c` shortcut, re-skinned
  nav + empty states, `SmartViewShell` + shared nav config, `Button` primitive,
  dark mode, command palette.
