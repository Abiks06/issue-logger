-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SLA_AT_RISK';
ALTER TYPE "NotificationType" ADD VALUE 'SLA_BREACHED';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "slaAlert" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "wipLimits" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "SlaTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL,
    "respondMinutes" INTEGER,
    "resolveMinutes" INTEGER,

    CONSTRAINT "SlaTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlaTarget_projectId_priority_key" ON "SlaTarget"("projectId", "priority");

-- AddForeignKey
ALTER TABLE "SlaTarget" ADD CONSTRAINT "SlaTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep new tables closed to Supabase public roles (see the baseline migration).
ALTER TABLE "SlaTarget" ENABLE ROW LEVEL SECURITY;
