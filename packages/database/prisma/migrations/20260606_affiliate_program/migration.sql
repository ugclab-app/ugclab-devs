-- CreateEnum
CREATE TYPE "AffiliatePartnerStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('APPROVED', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "AffiliateProgramSettings" (
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultCommissionBps" INTEGER NOT NULL DEFAULT 1000,
    "cookieDays" INTEGER NOT NULL DEFAULT 30,
    "attributionModel" TEXT NOT NULL DEFAULT 'last_click',
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AffiliateProgramSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "AffiliatePartner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "commissionBps" INTEGER,
    "status" "AffiliatePartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AffiliatePartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderTotalCents" INTEGER NOT NULL,
    "merchantNetCents" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'APPROVED',
    "paidAt" TIMESTAMPTZ(6),
    "payoutNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "affiliatePartnerId" TEXT,
ADD COLUMN "affiliateCommissionCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "AffiliatePartner_tenantId_code_key" ON "AffiliatePartner"("tenantId", "code");

-- CreateIndex
CREATE INDEX "AffiliatePartner_tenantId_status_idx" ON "AffiliatePartner"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommission_orderId_key" ON "AffiliateCommission"("orderId");

-- CreateIndex
CREATE INDEX "AffiliateCommission_tenantId_status_idx" ON "AffiliateCommission"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AffiliateCommission_partnerId_status_idx" ON "AffiliateCommission"("partnerId", "status");

-- CreateIndex
CREATE INDEX "Order_affiliatePartnerId_idx" ON "Order"("affiliatePartnerId");

-- AddForeignKey
ALTER TABLE "AffiliateProgramSettings" ADD CONSTRAINT "AffiliateProgramSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePartner" ADD CONSTRAINT "AffiliatePartner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "AffiliatePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_affiliatePartnerId_fkey" FOREIGN KEY ("affiliatePartnerId") REFERENCES "AffiliatePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
