# Taskmaster — Manual QA Checklist

Run through each section before release. Check the box when the step passes.

---

## 1. Authentication

- [ ] **Sign up** — Create a new account with email/password → redirected to protected route
- [ ] **Log in** — Sign in with existing credentials → lands on `/today`
- [ ] **Log out** — Click sign out → redirected to `/auth/login`
- [ ] **Protected route guard** — Visit `/today` while logged out → redirected to `/auth/login`

---

## 2. Task CRUD

- [ ] **Quick-add** — Type a title in the QuickAdd bar, press Enter → task appears in list immediately
- [ ] **Open TaskSheet** — Click a task row → bottom sheet opens with title, notes, priority, due date, status fields
- [ ] **Edit title** — Change the task title in TaskSheet, close → title persists on reload
- [ ] **Edit notes** — Add/edit notes text → persists on reload
- [ ] **Set priority** — Change priority (1–4) → badge/indicator updates, persists on reload
- [ ] **Set due date** — Pick a due date → task appears in correct smart view (Today/Upcoming)
- [ ] **Change status** — Set status to `in_progress` → visual indicator updates
- [ ] **Complete task** — Toggle task to done → completion indicator shown, task removed from active views
- [ ] **Reopen task** — Toggle a completed task back to `todo` → reappears in active views
- [ ] **Delete task** — Delete a task → removed from list and not visible on reload

---

## 3. Task Lists

- [ ] **Create list** — Create a new task list with name and color → appears in `/lists` sidebar
- [ ] **Rename list** — Edit list name → persists on reload
- [ ] **Change list color** — Pick a new color → badge/indicator updates
- [ ] **Delete list** — Delete a list → list and its tasks are removed
- [ ] **Create task in list** — On `/lists/[id]`, quick-add a task → task has correct `list_id`
- [ ] **Sort order** — Reorder lists (if supported) → order persists

---

## 4. List Sharing + Permissions

- [ ] **Invite member (editor)** — Enter email, assign `editor` role → member appears in member list
- [ ] **Invite member (viewer)** — Enter email, assign `viewer` role → member appears in member list
- [ ] **Editor creates task** — As editor, quick-add a task in shared list → succeeds
- [ ] **Editor edits task** — As editor, open TaskSheet and modify a task → succeeds
- [ ] **Viewer cannot edit** — As viewer, verify edit controls are hidden (no QuickAdd, no edit in TaskSheet)
- [ ] **Owner changes role** — Change a member from editor → viewer → role updates, viewer restrictions apply
- [ ] **Owner removes member** — Remove a member → member disappears from list
- [ ] **Non-owner cannot manage members** — As editor/viewer, verify member management UI is hidden or returns error

---

## 5. Today / Upcoming / Inbox Views

- [ ] **Overdue in Today** — Create a task due yesterday → appears in `/today` under "Overdue" section
- [ ] **Due today in Today** — Create a task due today → appears in `/today` under "Due Today" section
- [ ] **Future task in Upcoming** — Create a task due tomorrow → appears in `/upcoming`, NOT in `/today`
- [ ] **7-day window** — Create a task due in 7 days → appears in `/upcoming`
- [ ] **Beyond window** — Create a task due 8+ days out → does NOT appear in `/upcoming`
- [ ] **Inbox** — Create a task with no list and no due date → appears in `/inbox`
- [ ] **Completed hidden** — Complete a task → disappears from Today/Upcoming/Inbox
- [ ] **Day grouping** — Upcoming view groups tasks by day with correct date headers

---

## 6. Recurring Tasks — Roll-Forward

- [ ] **Daily recurrence** — Create daily recurring task (interval=1) due today → complete → new instance due tomorrow, status reset to `todo`
- [ ] **Weekly recurrence** — Create weekly recurring task (interval=1, no byweekday) → complete → new due date = +7 days
- [ ] **Weekly with byweekday** — Create weekly task with byweekday=[0,2,4] (Mon/Wed/Fri) → complete on Monday → next due is Wednesday
- [ ] **Monthly clamping** — Create monthly recurring task due Jan 31 → complete → next due is Feb 28 (or 29 in leap year)
- [ ] **End condition (on_date)** — Create recurring task with end date = tomorrow → complete today → new instance created; complete after end date → task stays done (no roll-forward)
- [ ] **End condition (never)** — Create recurring task with end = never → complete multiple times → always rolls forward
- [ ] **last_completed_at set** — After roll-forward, verify `last_completed_at` is set in database
- [ ] **reminder_at cleared** — After roll-forward, verify `reminder_at` is null on the new instance
- [ ] **Recurrence indicator** — Recurring tasks show recurrence icon in TaskRow

---

## 7. Checklist Items + Auto-Complete

- [ ] **Add item** — Open TaskSheet, add a checklist item → item appears with correct label
- [ ] **Add multiple items** — Add 3+ items → displayed in correct position order
- [ ] **Toggle item** — Check a checklist item → `is_completed` toggles visually
- [ ] **Delete item** — Delete a checklist item → removed from list
- [ ] **Progress badge** — TaskRow shows progress (e.g., "2/3") matching checked/total items
- [ ] **Auto-complete (non-recurring)** — Check all items on a non-recurring task → parent task auto-completes (status=done)
- [ ] **Auto-complete (recurring)** — Check all items on a recurring task → roll-forward triggers, checklist items reset to unchecked on new instance
- [ ] **Partial check preserved** — Check 1 of 3 items, reload → checked state persists

---

## 8. Push Notifications

- [ ] **Enable notifications** — Go to `/settings`, toggle notifications on → browser permission prompt appears, subscription saved to `push_subscriptions`
- [ ] **Set reminder** — Open a task in TaskSheet, set a reminder date/time → `reminder_at` saved
- [ ] **Quick presets** — Verify reminder quick-preset buttons work (e.g., "In 1 hour", "Tomorrow morning")
- [ ] **Notification delivered** — Wait for cron cycle (or manually hit `/api/cron/notifications` with `Authorization: Bearer <CRON_SECRET>`) → notification row created in `notifications` table
- [ ] **Push received** — Verify browser push notification appears with task title
- [ ] **Bell badge** — Notification bell in nav shows unread count
- [ ] **Notification center** — Click bell → popover shows notification with task title and time
- [ ] **Mark as read** — Click a notification → `is_read` updates, badge count decrements
- [ ] **Disable notifications** — Toggle off in `/settings` → subscription removed from `push_subscriptions`

---

## 9. Assigned to Me

- [ ] **Assign task** — In a shared list, assign a task to yourself → task appears in `/assigned`
- [ ] **Assign to member** — Assign a task to another list member → appears in their `/assigned` view
- [ ] **Unassign** — Remove assignment from a task → disappears from `/assigned`
- [ ] **Assignee display** — Task shows assignee name/avatar in TaskRow

---

## 10. Cross-Cutting

- [ ] **Responsive layout** — Test on mobile viewport (375px) → layout adapts, no horizontal scroll
- [ ] **PWA install** — On mobile/desktop, verify "Add to Home Screen" prompt or install option is available
- [ ] **Page reload** — Reload any protected page → data loads correctly, no flash of unauthenticated content
- [ ] **Empty states** — View each smart list with no matching tasks → appropriate empty state message shown
- [ ] **Error handling** — Disconnect network, attempt a task action → graceful error (toast or inline message)
