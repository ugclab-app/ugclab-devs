-- Add review photos (run if prisma db push is unavailable)
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
