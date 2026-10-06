-- AlterEnum
ALTER TYPE "EmailAutomationType" ADD VALUE IF NOT EXISTS 'CUSTOM';

-- AlterTable
ALTER TABLE "EmailAutomation" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "EmailAutomation" ADD COLUMN IF NOT EXISTS "segment" "EmailCampaignSegment";

-- Drop unique (tenantId, type) so multiple CUSTOM automations are allowed
DO $$ BEGIN
  ALTER TABLE "EmailAutomation" DROP CONSTRAINT IF EXISTS "EmailAutomation_tenantId_type_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "EmailAutomation_tenantId_type_idx" ON "EmailAutomation"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "EmailAutomation_tenantId_enabled_idx" ON "EmailAutomation"("tenantId", "enabled");
