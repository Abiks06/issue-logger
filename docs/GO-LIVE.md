# Go-live runbook

Switching production (Vercel project `issue-logger`, Supabase project
`Issue_logger_db`) from v1 to v2. Expect a few minutes of downtime between
replacing the schema and the new deployment finishing.

## Before

- [ ] All checks green: `npm run typecheck && npm run lint && npm test && npm run build`.
- [ ] Vercel production environment variables:

  | Variable | Value |
  | :-- | :-- |
  | `DATABASE_URL` | Supabase **transaction** pooler, port 6543 |
  | `DIRECT_URL` | Supabase **session** pooler, port 5432 (used by `prisma migrate deploy`) |
  | `AUTH_SECRET` (or existing `NEXTAUTH_SECRET`) | 32+ random characters; keeping v1's value is fine |
  | `NEXT_PUBLIC_APP_URL` | The production URL, e.g. `https://issue-logger-beta.vercel.app` |
  | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` or `RESEND_API_KEY` | Mail transport (required: production sign-ups need verification emails) |
  | `CRON_SECRET` | New random string, 16+ characters (Vercel Cron sends it automatically) |

- [ ] Fresh backup of the v1 data (read-only):

  ```bash
  docker run --rm -e PGURL="<DIRECT_URL>" -v "<backup folder>:/backup" postgres:17-alpine \
    sh -c 'pg_dump "$PGURL" --format=custom --no-owner --no-privileges --schema=public --file=/backup/v1-final.dump'
  ```

- [ ] Restore that backup into a local database to use as the import source:

  ```bash
  createdb issue_logger_prod_backup
  pg_restore --no-owner --no-privileges --dbname=<local URL>/issue_logger_prod_backup v1-final.dump
  ```

## Switch

1. **Replace the v1 schema** on Supabase (the data is in the backup):

   ```sql
   DROP TABLE IF EXISTS "Issue", "VerificationToken", "User", "_prisma_migrations", "_rate_limits" CASCADE;
   DROP TYPE IF EXISTS "Status", "Priority";
   ```

2. **Create the v2 schema**: `DATABASE_URL=<DIRECT_URL> DIRECT_URL=<DIRECT_URL> npx prisma migrate deploy`
3. **Import v1 accounts and issues**: `DATABASE_URL=<DIRECT_URL> npm run migrate:v1 -- --source <local backup URL>` (run with `--dry-run` first).
4. **Deploy**: merge to the production branch. The Vercel build (`scripts/vercel-build.mjs`) runs `prisma migrate deploy` on production builds only; after step 2 it's a no-op.

## After

- [ ] `GET /api/health` returns `{"status":"ok"}`.
- [ ] Sign in with an existing v1 account; their issues appear in a private project.
- [ ] Register a new account and receive the verification email.
- [ ] Supabase **Advisors → Security** shows no RLS warnings.
- [ ] Optional: point an uptime monitor at `/api/health`.

## Rollback

Redeploy the last v1 deployment in Vercel, then restore the v1 backup:

```sql
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
```

```bash
pg_restore --no-owner --no-privileges --dbname=<DIRECT_URL> v1-final.dump
```
