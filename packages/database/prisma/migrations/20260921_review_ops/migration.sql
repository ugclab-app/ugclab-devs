-- ProductReview: merchant reply, pin, helpful, order link
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "merchantReply" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "merchantRepliedAt" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "ProductReview_productId_pinned_idx" ON "ProductReview"("productId", "pinned");
CREATE INDEX IF NOT EXISTS "ProductReview_orderId_idx" ON "ProductReview"("orderId");

DO $$ BEGIN
  ALTER TABLE "ProductReview"
    ADD CONSTRAINT "ProductReview_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
