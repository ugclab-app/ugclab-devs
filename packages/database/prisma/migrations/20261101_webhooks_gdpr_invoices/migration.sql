-- Merchant webhook delivery log + retries
DO $$ BEGIN
  CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MerchantWebhookDelivery" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(6),
  "lastStatusCode" INTEGER,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantWebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MerchantWebhookDelivery_tenantId_createdAt_idx" ON "MerchantWebhookDelivery"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "MerchantWebhookDelivery_webhookId_createdAt_idx" ON "MerchantWebhookDelivery"("webhookId", "createdAt");
CREATE INDEX IF NOT EXISTS "MerchantWebhookDelivery_status_nextAttemptAt_idx" ON "MerchantWebhookDelivery"("status", "nextAttemptAt");
DO $$ BEGIN
  ALTER TABLE "MerchantWebhookDelivery" ADD CONSTRAINT "MerchantWebhookDelivery_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MerchantWebhookDelivery" ADD CONSTRAINT "MerchantWebhookDelivery_webhookId_fkey"
    FOREIGN KEY ("webhookId") REFERENCES "MerchantWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GDPR
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "anonymizedAt" TIMESTAMPTZ(6);

-- Invoice numbering
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
CREATE INDEX IF NOT EXISTS "Order_tenantId_invoiceNumber_idx" ON "Order"("tenantId", "invoiceNumber");

-- Turnstile (per-store keys; platform-wide keys come from env)
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "turnstileSiteKey" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "turnstileSecretKey" TEXT;
