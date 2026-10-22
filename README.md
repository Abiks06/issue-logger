# Issue Logger

A team issue tracker with a built-in error ingestion API. Plan work on a Kanban board, triage in a filterable list, discuss in threaded comments with @mentions, and let your own services report crashes straight into a project — repeats are grouped into one issue, and an error that comes back after it was fixed reopens itself as a regression.

**[Live demo (v1)](https://issue-logger-beta.vercel.app)**

## What's new in v2

v1 was a single-user list of issues. v2 rebuilds it around teams and automation:

| | v1 | v2 |
| :-- | :-- | :-- |
| Organisation | One flat list per user | Projects with short keys (`API-42`), per-project numbering |
| Collaboration | Single user | Members with Owner / Admin / Member / Viewer roles |
| Workflow | Open → In progress → Closed | Backlog → Todo → In progress → In review → Done / Canceled |
| Views | List | Drag-and-drop board, filterable list with bulk edits, insights |
| Issue fields | Title, description, priority | + type, assignee, labels, due date, estimate |
| History | — | Full activity timeline and Markdown comments |
| Notifications | — | Inbox for assignments, mentions, comments, status changes and regressions |
| Automation | — | Ingestion API with fingerprint grouping and regression detection |
| Navigation | Navbar | Sidebar, ⌘K command palette, keyboard shortcuts |
| Export | — | CSV export that honours the current filters |

## Features

- **Projects and roles.** Each project has a key, colour, labels and members. Viewers read, members edit and comment, admins manage settings, members, labels and API keys, owners can delete. Every server action re-checks the role; non-members get a 404 so project keys can't be probed.
- **Board.** Columns per status with drag-and-drop ordering (fractional positions, so a move rewrites one row). Moves are optimistic and roll back if the server refuses. Filter cards by text or "assigned to me".
- **List.** Search (title, body, `#number` or `KEY-123`), filter by status, priority, type, assignee and label, sort five ways, paginate. All state lives in the URL, so filtered views can be bookmarked. Select rows to change status, priority or assignee in bulk, or delete.
- **Issue page.** Markdown description with templates per issue type, inline property editing, comments with @mentions, and a timeline of every change.
- **Inbox.** Notifications for assignments, mentions, comments on issues you reported or own, status changes and regressions. Opening an issue clears its notifications.
- **Insights.** Created-vs-resolved chart for the last 30 days, net flow, median time to resolve, overdue count, breakdowns by status, priority and assignee, and the most frequent reported errors.
- **My work.** Everything assigned to you across projects, grouped by status, with overdue and due-this-week counts and recent activity.
- **Ingestion API.** See below.
- **Accounts.** Email/password sign-up with email verification, password reset, profile and password change, JWT sessions with a 30-minute idle timeout.
- **Polish.** ⌘K / Ctrl+K command palette, `c` to create, `/` to search, `g i` / `g p` / `g h` to navigate. Light, dark and system themes. Works down to phone width.

## Ingestion API

Create a key under **Project → Settings → API keys**. Keys are shown once and stored only as SHA-256 hashes.

```bash
curl -X POST https://your-app/api/v1/events \
  -H "Authorization: Bearer il_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TypeError: Cannot read properties of undefined",
    "level": "error",
    "environment": "production",
    "message": "Checkout failed for order 1234",
    "stacktrace": "at submitOrder (src/checkout.ts:42:13)",
    "metadata": { "orderId": 1234 }
  }'
```

| Field | Notes |
| :-- | :-- |
| `title` | Required. |
| `level` | `fatal`, `error` (default), `warning` or `info`. Sets priority (Urgent → Low); `fatal` creates an Incident. |
| `message`, `stacktrace`, `metadata` | Rendered into the issue description. |
| `environment` | Shown on the issue. |
| `fingerprint` | Optional grouping key. Without it, events are grouped by title (digits ignored) plus the top stack frame (line numbers ignored), so "timeout after 3012ms" and "timeout after 2990ms" land on the same issue. |

Responses: `201` for a new issue, `200` for a repeat (`occurrences` incremented). If the matching issue is Done or Canceled it moves back to Todo, logs a regression on its timeline and notifies the assignee and reporter (`"regressed": true`). `401` for a missing/revoked key, `422` for an invalid body, `429` past 120 requests per minute per key.

`GET /api/v1/issues?status=TODO,IN_PROGRESS&limit=50` returns the key's project issues.

## Tech stack

| Layer | Tools |
| :-- | :-- |
| Framework | Next.js 16 (App Router, Server Actions, Proxy), React 19 with the React Compiler, TypeScript |
| Data | PostgreSQL, Prisma 7 with the `pg` driver adapter |
| Auth | Auth.js (NextAuth v5) credentials provider, bcrypt |
| Validation | Zod 4, shared by client forms, server actions and the API |
| Email | Resend API or any SMTP server via Nodemailer |
| UI | Tailwind CSS 4, Lucide icons, next-themes, react-markdown + GFM, react-hot-toast |
| Tests | Vitest |

## Project layout

```
actions/          Server actions (auth, projects, issues, session)
app/(app)/        Signed-in pages: My work, inbox, projects, board, list, issue, insights, settings
app/auth/         Sign-in, sign-up, verification and password reset
app/api/v1/       Ingestion and read API (API-key auth)
components/       UI: app shell, command palette, board, issue views, charts, settings
lib/              Access control, permissions, validation, filters, ordering, ingestion, analytics
prisma/           Schema, migration and demo seed
tests/            Unit tests for the pure logic in lib/
```

## Running locally

1. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npx prisma generate
   ```

2. Start Postgres. Any Postgres 14+ works; with Docker:

   ```bash
   docker run -d --name issue-logger-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=issue_logger -p 54329:5432 postgres:17-alpine
   ```

   (`prisma dev` also starts a local database, but its PGlite-based server dropped connections under the app's concurrent queries during testing, so a real Postgres is recommended.)

3. Copy `.env.example` to `.env` and fill it in. Without mail settings, accounts created in development are verified automatically.

4. Apply the schema, load demo data and start the dev server:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

   The seed creates two projects (`WEB`, `PAY`) and three demo users; their sign-in details are at the top of `prisma/seed.ts`.

## Scripts

| Script | What it does |
| :-- | :-- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (permissions, ordering, filters, ingestion grouping, activity diffs, analytics, CSV) |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm run db:migrate` / `db:deploy` | Prisma migrations |
| `npm run db:seed` | Replace the demo users and projects |

## Upgrading from v1

v2 replaces the data model (string ids, projects, members, new status and priority values), and v1's migration history no longer matched its own schema. The repository now has a single baseline migration, so an existing v1 database needs to be reset rather than migrated in place. Export anything you want to keep first.

## Security notes

- Passwords are hashed with bcrypt (cost 12). Login is rate-limited per email, unknown emails are checked against a dummy hash so timing doesn't reveal which accounts exist, and verification state is only revealed after the password matches.
- Email verification and password reset tokens are single-use, expire, and are stored as SHA-256 hashes. Verification needs a click, so mail scanners can't consume the link.
- API keys are stored as hashes, can be revoked, and are rate-limited. CSV export neutralises spreadsheet formulas.
- The migration enables Row Level Security with no policies on every table. The app connects as the table owner and is unaffected; on Supabase this closes the tables to the public REST roles.
- Rate limiting is in-process memory; on a multi-instance deployment, back it with Redis or similar.
