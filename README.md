# Taskmaster

A collaborative task management app built with SvelteKit, Svelte 5, Supabase, and TailwindCSS. Supports shared lists with role-based permissions, recurring tasks, checklist items, push notifications, and smart views.

## Features

- **Task CRUD** — Create, edit, prioritize, and organize tasks with notes and due dates
- **Task Lists** — Color-coded lists with drag-and-drop ordering
- **Smart Views** — Today (overdue + due today), Upcoming (7-day lookahead), Inbox (unassigned tasks), Assigned to Me
- **List Sharing** — Invite members by email with role-based permissions (owner / editor / viewer)
- **Recurring Tasks** — Daily, weekly (with weekday selection), and monthly frequencies with automatic roll-forward on completion
- **Checklist Items** — Sub-items within tasks; checking all items auto-completes the parent task
- **Push Notifications** — Web Push reminders with scheduling presets and a notification center
- **PWA** — Installable as a Progressive Web App with service worker support

## Prerequisites

- Node.js >= 20
- npm (or pnpm)
- A [Supabase](https://supabase.com) project

## Setup

### 1. Clone and install

```sh
git clone <your-repo-url>
cd Taskmaster
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ORIGIN` | Trusted origin for auth redirects (e.g., `http://localhost:5174`) |
| `PUBLIC_VAPID_KEY` | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | VAPID private key (server-side only) |
| `VAPID_SUBJECT` | VAPID subject (e.g., `mailto:you@example.com`) |
| `CRON_SECRET` | Bearer token for the reminder cron endpoint |

### 3. Set up the database

Run the SQL migrations against your Supabase project. You can either:

- Use the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase db push`
- Or run each file in `supabase/migrations/` manually via the Supabase SQL Editor

### 4. (Optional) Seed sample data

```sh
psql <your-supabase-connection-string> -f supabase/seed.sql
```

Edit `supabase/seed.sql` first and replace the placeholder `user_id` with your actual Supabase auth user ID (find it in Dashboard → Authentication → Users).

### 5. Generate VAPID keys (for push notifications)

```sh
npx web-push generate-vapid-keys
```

Copy the output into `PUBLIC_VAPID_KEY` and `VAPID_PRIVATE_KEY` in your `.env` file.

### 6. Start development server

```sh
npm run dev
```

The app runs at [http://localhost:5174](http://localhost:5174).

## Recurring Tasks

Tasks can be set to recur on a schedule. When a recurring task is completed, a new instance is automatically created with the next due date.

| Frequency | Fields | Example |
|---|---|---|
| `daily` | `interval` | Every 2 days (`interval: 2`) |
| `weekly` | `interval`, `byweekday` (0=Mon .. 6=Sun) | Every week on Mon, Wed, Fri (`byweekday: [0, 2, 4]`) |
| `monthly` | `interval` | Every month (day clamped to month end, e.g., Jan 31 → Feb 28) |

End conditions: `never` (default) or `on_date` with an ISO date string.

The recurrence rule is stored as JSONB in the `recurrence_rule` column:

```json
{
  "frequency": "weekly",
  "interval": 1,
  "byweekday": [0, 2, 4],
  "time_of_day": "09:00",
  "ends": { "type": "never" }
}
```

## Push Notifications

1. Generate VAPID keys and add them to your `.env` (see setup step 5)
2. Set `CRON_SECRET` to a random string in `.env`, Vercel environment settings, and GitHub Actions secrets
3. Set `REMINDER_CRON_URL` as a GitHub Actions secret pointing to your deployed endpoint (for example: `https://taskmaster-git-development-<scope>.vercel.app/api/cron/notifications`)
4. The GitHub Actions scheduler (`.github/workflows/reminder-cron.yml`) runs every 5 minutes and calls `/api/cron/notifications`
5. Users enable notifications in Settings → the browser will prompt for permission
6. Reminder delivery latency is typically up to 5 minutes plus GitHub Actions scheduling jitter

For local testing, you can trigger the cron manually:

```sh
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:5174/api/cron/notifications
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5174) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run check` | Svelte/TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |

## Deployment

Taskmaster is configured for [Vercel](https://vercel.com) deployment via `@sveltejs/adapter-vercel`. Push to your connected branch to deploy.

Ensure all environment variables from `.env.example` are set in your Vercel project settings.

For reminder scheduling on Vercel Hobby:
- `vercel.json` does not define a Vercel cron.
- GitHub Actions is used instead (see `.github/workflows/reminder-cron.yml`).
- Keep your GitHub default branch set to `development` so scheduled workflows run from that branch.

## Project Structure

```
src/
├── lib/
│   ├── components/   # Svelte components (TaskRow, TaskSheet, etc.)
│   ├── server/       # Server-side utilities (task-actions, supabase-admin)
│   ├── types/        # TypeScript interfaces
│   └── utils/        # Shared utilities (recurrence engine)
├── routes/
│   ├── (protected)/  # Authenticated routes (today, upcoming, lists, etc.)
│   ├── (public)/     # Public routes (auth/login)
│   └── api/          # API endpoints (push, notifications, cron)
supabase/
├── migrations/       # SQL migration files
└── seed.sql          # Sample data for development
```
