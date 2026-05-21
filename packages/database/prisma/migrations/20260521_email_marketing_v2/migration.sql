-- Email marketing v2 (run if db push unavailable)

ALTER TYPE "EmailCampaignStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';

ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'ABANDONED_CART';
ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'INACTIVE_90';
ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'COLLECTION';
ALTER TYPE "EmailCampaignSegment" ADD VALUE IF NOT EXISTS 'PRODUCT';

CREATE TYPE "EmailAutomationType" AS ENUM ('WELCOME', 'POST_PURCHASE', 'WINBACK');

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "emailBounced" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "subjectB" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "abTestPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "plainText" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "discountCode" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "collectionSlug" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMPTZ(6);
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "EmailSubscriber" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "source" TEXT NOT NULL DEFAULT 'import',
  "marketingOptOut" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailSubscriber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubscriber_tenantId_email_key" ON "EmailSubscriber"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "EmailSubscriber_tenantId_idx" ON "EmailSubscriber"("tenantId");

CREATE TABLE IF NOT EXISTS "EmailAutomation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "EmailAutomationType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "delayHours" INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "EmailAutomation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailAutomation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailAutomation_tenantId_type_key" ON "EmailAutomation"("tenantId", "type");

CREATE INDEX IF NOT EXISTS "EmailCampaign_tenantId_status_scheduledAt_idx" ON "EmailCampaign"("tenantId", "status", "scheduledAt");
