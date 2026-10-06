-- Email marketing: deeper segments + double opt-in
ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'RECENT_30';
ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'RFM_CHAMPIONS';

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "emailDoubleOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmailSubscriber" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ(6);
-- Existing subscribers treated as confirmed
UPDATE "EmailSubscriber" SET "confirmedAt" = "createdAt" WHERE "confirmedAt" IS NULL;
