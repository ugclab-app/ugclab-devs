ALTER TABLE "PlatformMailboxThread"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS "PlatformMailboxThread_status_lastMessageAt_idx"
  ON "PlatformMailboxThread"("status", "lastMessageAt");

ALTER TABLE "PlatformMailboxMessage"
  ADD COLUMN IF NOT EXISTS "attachmentMeta" JSONB;

CREATE TABLE IF NOT EXISTS "PlatformMailboxNote" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMailboxNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformMailboxNote_threadId_createdAt_idx"
  ON "PlatformMailboxNote"("threadId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PlatformMailboxNote"
    ADD CONSTRAINT "PlatformMailboxNote_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "PlatformMailboxThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
