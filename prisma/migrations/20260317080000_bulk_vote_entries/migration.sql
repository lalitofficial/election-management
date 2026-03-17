ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'BULK_VOTE';

CREATE TABLE "BulkVoteEntry" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkVoteEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BulkVoteEntry_createdAt_idx" ON "BulkVoteEntry"("createdAt");
CREATE INDEX "BulkVoteEntry_actorId_createdAt_idx" ON "BulkVoteEntry"("actorId", "createdAt");

ALTER TABLE "BulkVoteEntry" ADD CONSTRAINT "BulkVoteEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
