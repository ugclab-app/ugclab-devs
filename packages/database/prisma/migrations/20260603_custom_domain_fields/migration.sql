-- AlterTable
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ(6);
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "verifiedByEmail" TEXT;
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "lastDnsCheckAt" TIMESTAMPTZ(6);
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "lastDnsOk" BOOLEAN;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomDomain_verified_idx" ON "CustomDomain"("verified");
