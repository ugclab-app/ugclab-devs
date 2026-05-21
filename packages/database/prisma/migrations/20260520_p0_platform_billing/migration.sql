ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "trialDays" INTEGER NOT NULL DEFAULT 14;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeBillingCustomerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_stripeBillingCustomerId_key" ON "Tenant"("stripeBillingCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
