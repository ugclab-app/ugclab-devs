-- Finik KG QR payment fields on orders
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "finikPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "finikTransactionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_finikPaymentId_key" ON "Order"("finikPaymentId");

CREATE TABLE IF NOT EXISTS "FinikWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinikWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinikWebhookEvent_processed_createdAt_idx"
    ON "FinikWebhookEvent"("processed", "createdAt");
