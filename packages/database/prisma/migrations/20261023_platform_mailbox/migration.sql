-- Platform mailbox: conversations sent and received at the platform address
CREATE TABLE IF NOT EXISTS "PlatformMailboxThread" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "correspondentEmail" TEXT NOT NULL,
  "correspondentName" TEXT,
  "unread" BOOLEAN NOT NULL DEFAULT false,
  "lastMessageAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMailboxThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlatformMailboxMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "textBody" TEXT NOT NULL,
  "htmlBody" TEXT,
  "attachments" TEXT,
  "resendEmailId" TEXT,
  "rfcMessageId" TEXT,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMailboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformMailboxThread_lastMessageAt_idx"
  ON "PlatformMailboxThread"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "PlatformMailboxThread_correspondentEmail_idx"
  ON "PlatformMailboxThread"("correspondentEmail");
CREATE INDEX IF NOT EXISTS "PlatformMailboxThread_unread_idx"
  ON "PlatformMailboxThread"("unread");
CREATE INDEX IF NOT EXISTS "PlatformMailboxMessage_threadId_createdAt_idx"
  ON "PlatformMailboxMessage"("threadId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformMailboxMessage_resendEmailId_key"
  ON "PlatformMailboxMessage"("resendEmailId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformMailboxMessage_rfcMessageId_key"
  ON "PlatformMailboxMessage"("rfcMessageId");

DO $$ BEGIN
  ALTER TABLE "PlatformMailboxMessage"
    ADD CONSTRAINT "PlatformMailboxMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "PlatformMailboxThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
