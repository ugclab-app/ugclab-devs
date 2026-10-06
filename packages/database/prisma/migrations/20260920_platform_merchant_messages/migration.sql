-- Platform → merchant direct messages
CREATE TABLE IF NOT EXISTS "PlatformMerchantMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
  "readAt" TIMESTAMP(6) WITH TIME ZONE,
  "merchantReply" TEXT,
  "merchantRepliedAt" TIMESTAMP(6) WITH TIME ZONE,
  "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMerchantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformMerchantMessage_tenantId_createdAt_idx"
  ON "PlatformMerchantMessage"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformMerchantMessage_tenantId_readAt_idx"
  ON "PlatformMerchantMessage"("tenantId", "readAt");

DO $$ BEGIN
  ALTER TABLE "PlatformMerchantMessage"
    ADD CONSTRAINT "PlatformMerchantMessage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
