-- Prisma's bookkeeping table lives in "public", where Supabase exposes tables to
-- its anon/authenticated roles. RLS with no policies closes it to them; Prisma
-- connects as the owner and is unaffected.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
