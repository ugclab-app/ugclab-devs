-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false;
