# Decisions log

Non-obvious choices in Issue Logger v2, why they were made, and what they cost.
Newest last. Add an entry when you make a choice a future maintainer might
otherwise "fix".

Each entry: **Context** (the problem), **Choice**, **Consequences** (including
what we gave up).

---

## 1. Fresh schema with a single baseline migration

**Context.** v1's migration history no longer matched its schema (`emailVerified`
was a boolean in the migration and a timestamp in the schema; `VerificationToken`
was never migrated), so `prisma migrate` couldn't be trusted. v2 also needed
projects, members, string ids and new enums.

**Choice.** Start v2 from one baseline migration (`20261022000000_v2_overhaul`)
with cuid string ids, rather than evolving v1's tables.

**Consequences.** v1 databases can't be upgraded in place. That's covered by a
separate import (decision 13) instead of an in-place migration.

## 2. Roles checked in every server action, not just pages

**Context.** Pages can be bypassed; server actions are public POST endpoints.

**Choice.** Every action calls `authorizeProject(projectId, capability)` with a
capability from `lib/permissions.ts` (viewer < member < admin < owner).
Non-members get the same 404 as a missing project.

**Consequences.** One extra membership query per action. Project keys can't be
probed.

## 3. Ingestion groups errors by fingerprint and reopens on regression

**Choice.** `POST /api/v1/events` groups by a client fingerprint or by
title-with-digits-removed + top stack frame without line numbers. A repeat on a
Done/Canceled issue reopens it and notifies the assignee.

**Consequences.** Different errors that share a title and top frame merge; clients
can send an explicit `fingerprint` to split them.

## 4. Sessions: 30 days, revocable, app-specific cookies

**Context.** v1's 30-minute absolute session logged people out constantly. A
second app on `localhost` with Auth.js's default cookie names was deleting this
app's cookie (browsers don't separate cookies by port).

**Choice.** JWT sessions re-issued on every request (30-day lifetime, or 12 hours
idle without "Keep me signed in"). Tokens carry `sessionVersion`, re-checked
against the database every 5 minutes, so a password change or "sign out other
devices" revokes other sessions. Cookies are named `issue-logger.*`. A failed
recheck (database blip) keeps the session rather than signing the user out.

**Consequences.** Revocation takes up to 5 minutes to reach other devices.

## 5. SLA clocks run on wall-clock time; "breached now" means a running clock

**Choice.** Response and resolution targets per priority, measured from creation
24/7. Response stops when work starts or a non-reporter comments. `worst`
includes targets already met or missed; `live` covers only running clocks, and
is what "breached now", My work and alerts use (and what the list filter can
express in SQL).

**Consequences.** No business-hours calendar. A missed response shows in hit
rates, not in "breached now".

## 6. SLA alerts are baselined when targets change

**Context.** Turning SLAs on for an existing backlog fired an alert for every
already-overdue issue at once.

**Choice.** `Issue.slaAlert` stores the highest alert sent. Changing targets
records the current level silently, so only issues that cross into at-risk or
breached afterwards alert. Sweeps run after page renders (throttled to once a
minute) and from `GET /api/cron/sla`.

## 7. Velocity is weekly points, not sprints

**Choice.** Points completed per Monday-start UTC week, a 4-week rolling average
of complete weeks, and a backlog forecast.

**Consequences.** No sprint planning or burndown. Unestimated issues are counted
but excluded from points.

## 8. WIP limits are soft

**Choice.** Over-limit columns turn red and moves show a warning, but moves are
never blocked.

**Consequences.** Limits nudge rather than enforce.

## 9. Local development uses a real Postgres, not `prisma dev`

**Context.** The PGlite-based `prisma dev` server dropped connections under the
app's concurrent queries.

**Choice.** Document Docker Postgres for local work.

## 10. Rate limits live in Postgres

**Context.** In-memory counters reset per server instance, so on serverless or
multiple instances the limits barely applied.

**Choice.** `lib/shared-rate-limit.ts`: one atomic `INSERT … ON CONFLICT` per
check against a `RateLimit` table. Keys are SHA-256 hashed (no emails or API keys
stored). Expired rows are swept occasionally. If the database is unreachable it
falls back to the per-instance memory limiter instead of failing open.

**Consequences.** One small write per login attempt or API call. Alternatives
considered: Redis/Upstash (another service to run) and in-memory only (rejected
above).

## 11. API routes are private by default

**Choice.** The proxy now covers `/api`. Routes that authenticate themselves are
listed in `PUBLIC_API_PREFIXES` (Auth.js, the API-key `/api/v1`, the
secret-protected cron hook, the stale-session reset); everything else returns 401
without a session. Route handlers still check access themselves.

**Consequences.** A new public endpoint must be added to the list on purpose.

## 12. Environment checked at startup

**Choice.** `instrumentation.ts` runs `lib/env.ts` once per server start.
Production refuses to start on missing or malformed required settings; development
logs them. Missing mail or app URL is a warning, not an error.

## 13. v1 data is imported, not migrated in place, into private projects

**Context.** Decision 1 means v1 tables can't be upgraded. v1 issues were visible
only to their author.

**Choice.** `scripts/migrate-v1.ts` reads a v1 database (never writing to it) and
copies into a fresh v2 database. Each v1 user keeps their email and bcrypt hash
(passwords keep working) and gets a private project they own. Existing v2 accounts
with the same email are reused, not overwritten. Issues whose author was deleted
are skipped unless `--orphans-to` names an owner. Imported projects get no SLA
targets, since old issues would all show as breached. The script refuses to run
twice into the same database, and handles both shapes of v1's drifted
`emailVerified` column.

**Alternative rejected.** Moving every v1 issue into one shared project would
expose users' private issues to each other.

**Consequences.** v1 had no close time, so `closedAt` is v1's last update time.
Verification and reset tokens aren't carried over; users can request new ones.

## 14. Issue preview opens beside the list

**Choice.** A plain click on a list title opens a side panel (status, priority,
assignee, description, latest comments); Ctrl/Cmd/middle-click and Enter still
open the full page. The list's keyboard shortcuts ignore keys handled by a picker
or typed inside the panel.
