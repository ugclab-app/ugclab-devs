-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_OPS';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_SUPPORT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_FINANCE';

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "platformCreditCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "featureFlags" JSONB;
ALTER TABLE "StripeWebhookEvent" ADD COLUMN IF NOT EXISTS "error" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlatformBlacklistEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformBlacklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBlacklistEntry_value_key" ON "PlatformBlacklistEntry"("value");
CREATE INDEX IF NOT EXISTS "PlatformBlacklistEntry_type_idx" ON "PlatformBlacklistEntry"("type");
