-- GoPay KG payment fields on orders
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "gopayPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "gopayOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_gopayPaymentId_key" ON "Order"("gopayPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_gopayOrderId_key" ON "Order"("gopayOrderId");

CREATE TABLE IF NOT EXISTS "GopayWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GopayWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GopayWebhookEvent_processed_createdAt_idx"
    ON "GopayWebhookEvent"("processed", "createdAt");
