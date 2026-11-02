CREATE TABLE IF NOT EXISTS "PlatformInboxAssignment" (
  "itemId" TEXT NOT NULL,
  "assigneeUserId" TEXT NOT NULL,
  "assigneeEmail" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformInboxAssignment_pkey" PRIMARY KEY ("itemId")
);
