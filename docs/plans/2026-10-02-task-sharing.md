# Share Taskmaster with a second person: private and shared tasks

## Context

Taskmaster has only ever had one user. A partner can already be added (the "Add
profile" tile on `/pick-profile`), but nothing is scoped to the active profile:

- Every loader (Today, Overdue, Inbox, Calendar, Completed, list pages, search)
  and the sidebar counts in `src/routes/(protected)/+layout.server.ts` query all
  tasks and all lists.
- Task writes (`src/lib/server/task-actions.ts`, `PATCH /api/tasks/[id]`) act on
  any task id.
- List sharing (`task_list_members`, roles, `MemberManager`) exists, but
  `addMember` looks profiles up by email and picker-created profiles have none.

Decisions made:

- **Privacy level: filtered views only.** Keep the click-a-tile picker and the
  `profile_id` cookie. No PIN, no Supabase Auth. Either person can still switch
  profile; this is privacy by courtesy, and the URL stays unauthenticated.
- **Sharing model: per-task toggle.** Each task is private or shared,
  independent of its list.

## Rules

One predicate, used everywhere a task is read or written:

> A profile can see a task if it **owns** it, is **assigned** to it, or the task
> is **shared**.

- "Shared" means visible to every profile in the household (there is no
  per-person audience).
- Only the owner can flip a task between private and shared.
- Lists stay membership-scoped: you see a list in the sidebar and can open it
  only if you are a member. Inside a list, tasks are still filtered by the
  predicate, so a private task in a joint list stays hidden from the other
  person.
- A shared task in a list the other person isn't a member of shows up in their
  smart views and search (with the list name as a chip), but they can't browse
  that list.
- Default for new tasks: shared if created in a list with more than one member,
  otherwise private. Quick Add gets a toggle to override.
- Existing data: all current tasks become private to their owner, except tasks
  in lists that already have more than one member.

## Changes

### 1. Migration `supabase/migrations/20261002_task_sharing.sql`

Header comment with the why, like the recent migrations.

- `alter table tasks add column is_shared boolean not null default false`.
- Backfill `is_shared = true` for tasks whose list has more than one
  `task_list_members` row.
- Partial index on `tasks (due_at) where is_shared` for the smart-view queries.
- Replace `get_list_task_counts()` with `get_list_task_counts(p_profile_id uuid)`:
  counts open tasks per list, restricted to lists the profile is a member of and
  tasks matching the predicate. Drop the old signature. Keep
  `set search_path = public, pg_catalog` and revoke EXECUTE from
  `public, anon, authenticated`, matching `20260815_harden_functions.sql`.
- RLS stays enabled with no policies (unchanged).

### 2. Visibility helper `src/lib/server/task-visibility.ts` (new)

- `visibleTo(query, profileId)`: applies
  `.or('owner_id.eq.<id>,assigned_to_user_id.eq.<id>,is_shared.eq.true')` to a
  tasks query.
- `isTaskVisibleTo(task, profileId)`: the same predicate as a pure function.
- `assertTaskAccess(supabase, taskId, profileId)`: loads
  `owner_id, assigned_to_user_id, is_shared` and returns the row or null.
- `task-visibility.test.ts` next to it for the pure predicate.

### 3. Scope reads

Wrap every tasks query with `visibleTo(...)`:

- `src/routes/(protected)/+layout.server.ts`: the six count queries; pass
  `p_profile_id` to the RPC; restrict sidebar lists to the profile's
  memberships (the membership query is already there).
- `today`, `overdue`, `inbox`, `calendar`, `completed`, `assigned`
  `+page.server.ts` loaders.
- `src/routes/(protected)/lists/+page.server.ts`: member lists only.
- `src/routes/(protected)/lists/[id]/+page.server.ts`: 404 unless a member;
  filter tasks.
- `src/routes/(protected)/api/search/+server.ts`.
- `GET /api/tasks/[id]` and the task-label endpoints: 404 when not visible.

### 4. Guard writes

- `src/routes/api/tasks/[id]/+server.ts` `PATCH`: call `assertTaskAccess`
  first; add `is_shared` to `ALLOWED_FIELDS`, validated as boolean and accepted
  only from the owner.
- `src/lib/server/task-actions.ts`: add a `profileId` argument to `toggleTask`,
  `updateTask`, `deleteTask` and the checklist actions and check access before
  mutating. Update the call sites in the seven `+page.server.ts` files (same
  one-line pattern as the existing `assignTask` call).
- List mutations in `lists/+page.server.ts` (`updateList`, `archiveList`,
  `unarchiveList`, `deleteList`): require owner role, reusing the check already
  in `updateListAppearance`. `verifyOwner` in `member-actions.ts` moves to a
  shared export for this.

### 5. Create paths

The five `createTask` actions (`today`, `inbox`, `assigned`, `calendar`,
`lists/[id]`) read an `is_shared` form field. When absent: list tasks default to
"list has more than one member", everything else to private.

### 6. UI

- `src/lib/types/index.ts`: `Task.is_shared: boolean`; add the owner relation
  to `TASK_SELECT` so shared tasks can show whose they are.
- `TaskSheet.svelte`: a Private / Shared control near the assignee row, shown to
  the owner, using `patchTask` from `src/lib/utils/api.ts`. Non-owners see a
  read-only "Shared by <name>" line.
- `TaskRow.svelte`: small shared indicator, plus a "Share" / "Make private"
  context-menu item for the owner.
- `QuickAdd.svelte`: a shared toggle writing a hidden `is_shared` input,
  initialised from a new `defaultShared` prop (set by the list page).
- `MemberManager.svelte` and `addMember` in `member-actions.ts`: replace the
  email field with a picker of household profiles that aren't members yet, and
  submit `user_id`. The list page loader supplies the profiles.

### 7. Mobile and desktop fit

All new sharing UI is built for both layouts, following the conventions already
in the app (bottom sheet under 768px and right-hand sheet above it in
`TaskSheet`, the `(hover: none)` touch check in `TaskRow`, the `tap-target`
class and 44px minimum hit areas, `md:` hover-reveal for secondary controls).

- **No sharing action is hover- or right-click-only.** The context-menu item in
  `TaskRow` is a desktop shortcut; the toggle in `TaskSheet` is the primary
  control and is what touch users get after tapping a row.
- **TaskSheet toggle**: a two-segment Private / Shared control, full width in
  the bottom sheet with 44px-high segments, compact inline in the desktop side
  sheet. It sits above the "Assign to" block so it is reachable without
  scrolling on a phone.
- **TaskRow indicator**: an icon-only badge in the existing metadata row, with
  an `aria-label` and a desktop tooltip. For tasks owned by the other person it
  becomes their avatar initial so ownership is readable without hover. Titles
  keep truncating before the badge wraps at 360px width.
- **QuickAdd toggle**: an icon-plus-label chip in the existing control row,
  which already stacks on mobile (`flex-col`) and goes inline at `md:`. It is
  part of the tab order on desktop and works with the keyboard (Space/Enter).
- **MemberManager**: the profile picker is a list of tappable rows with avatar
  and name inside the existing scrollable dialog (`max-h-[85vh]`), instead of a
  small select; the role select and remove button get 44px hit areas on touch.
- **Sidebar and mobile More page**: joint lists keep the existing `isShared`
  marker in both places, since both render from the same layout data.
- **Command palette / search results** (desktop palette and the mobile search
  page): shared tasks from the other person show the same owner badge.
- Dark mode: new elements use the existing design tokens only
  (`src/lib/utils/design-tokens.ts`, `src/app.css`), no hard-coded colors.

### 8. Docs

- `docs/plans/2026-10-02-task-sharing.md`: this design.
- `PROJECT_PLAN.md`: move the item through Outstanding to Recently done, link
  the plan, add the deferred items below under Future work, bump
  `_Last updated_`.
- `AGENTS.md`: one bullet describing the visibility predicate and the helper.

## Not in this change

- Any real authentication. The cookie is still a bare profile id, so the
  privacy here does not hold against someone who switches profile or calls the
  API with another id. A PIN or Supabase Auth can be added later without
  changing the visibility rules.
- Assigning tasks outside a joint list (assignment still requires list
  membership).
- Reminders for shared tasks still go to the assignee, else the owner
  (`src/routes/api/cron/notifications/+server.ts` is untouched).

## Verification

1. Apply the migration to the Supabase project (I will ask before running
   anything against the database), then confirm existing tasks have
   `is_shared = false`.
2. `npm run lint`, `npm run check`, `npm run test`, `npm run build`.
3. Manual, dev server on port 5174, two browsers or a normal and a private
   window:
   - Create a second profile. It starts with empty views and no lists.
   - As profile A, share one Inbox task. It appears for B in Inbox, Today or
     Calendar (by due date), search, and the count badges; A's other tasks
     don't.
   - As B, the shared task can be completed and edited, but the share toggle is
     read-only.
   - As A, make it private again. It disappears for B, and
     `GET /api/tasks/<id>` as B returns 404.
   - Add B to a list through the new member picker. The list appears in B's
     sidebar, new tasks there default to shared, and a task A marks private in
     that list is hidden from B with the list count matching.
   - As B, opening the URL of a list B isn't a member of returns 404.
4. Responsive pass on every new control, in light and dark mode:
   - Phone widths 360px and 390px with touch emulation: share a task using only
     taps (row tap, then the sheet toggle), use the Quick Add toggle from the
     bottom tab bar, add a member from the list page. No horizontal scroll, no
     control smaller than 44px, nothing hidden behind the tab bar or the
     keyboard.
   - Tablet 768px (the sheet breakpoint) and desktop 1280px: toggle from the
     side sheet, from the row context menu, and with the keyboard only.
