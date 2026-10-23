-- CreateTable
CREATE TABLE "RateLimit" (
    "key" VARCHAR(80) NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- Keep new tables closed to Supabase public roles (see the baseline migration).
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
