ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "TenantMember" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMPTZ(6);

UPDATE "TenantMember"
SET "inviteExpiresAt" = "createdAt" + interval '7 days'
WHERE "acceptedAt" IS NULL AND "inviteExpiresAt" IS NULL;
