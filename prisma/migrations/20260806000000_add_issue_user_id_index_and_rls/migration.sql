-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_userId_idx" ON "Issue"("userId");

-- Row Level Security (RLS) Advisory:
-- If Row Level Security is enabled on User and Issue tables in Supabase:
-- 1. If connecting via direct database connection (superuser role `postgres` or `service_role`), RLS is automatically bypassed.
-- 2. If connecting via an app/authenticated role subject to RLS, add policies to grant access:

-- Enable RLS (if not already enabled)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;

-- Permissive policy for App access (adjust filters if using Supabase Auth JWT instead of NextAuth)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'User' AND policyname = 'allow_app_all_users') THEN
        CREATE POLICY "allow_app_all_users" ON "User" FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Issue' AND policyname = 'allow_app_all_issues') THEN
        CREATE POLICY "allow_app_all_issues" ON "Issue" FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
