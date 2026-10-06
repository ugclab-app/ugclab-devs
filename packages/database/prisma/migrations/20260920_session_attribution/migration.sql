-- AlterTable StoreLiveVisitor: attribution + deepest funnel stage
ALTER TABLE "StoreLiveVisitor" ADD COLUMN IF NOT EXISTS "maxStage" TEXT NOT NULL DEFAULT 'browse';
ALTER TABLE "StoreLiveVisitor" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "StoreLiveVisitor" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "StoreLiveVisitor" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "StoreLiveVisitor" ADD COLUMN IF NOT EXISTS "referrer" TEXT;

CREATE INDEX IF NOT EXISTS "StoreLiveVisitor_tenantId_createdAt_idx" ON "StoreLiveVisitor"("tenantId", "createdAt");

-- AlterTable Order: UTM / landing for attribution reports
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "landingPath" TEXT;
