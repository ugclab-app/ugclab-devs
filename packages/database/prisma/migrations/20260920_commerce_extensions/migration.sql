-- Commerce extensions: preorder/TBYB, metafields, returns, BOPIS, B2B, subscriptions

CREATE TYPE "ReturnStatus" AS ENUM (
  'REQUESTED', 'APPROVED', 'DECLINED', 'LABEL_CREATED', 'IN_TRANSIT',
  'RECEIVED', 'REFUNDED', 'EXCHANGED', 'CANCELLED'
);
CREATE TYPE "MetafieldOwnerType" AS ENUM (
  'PRODUCT', 'VARIANT', 'CUSTOMER', 'ORDER', 'SHOP', 'METAOBJECT'
);
CREATE TYPE "B2bCompanyStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
CREATE TYPE "B2bBuyerRole" AS ENUM ('ADMIN', 'BUYER');
CREATE TYPE "ProductSubscriptionStatus" AS ENUM (
  'ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING', 'INCOMPLETE'
);

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "preorderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "preorderShipAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "tryBeforeYouBuyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tryBeforeYouBuyDays" INTEGER DEFAULT 30;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "b2bCompanyId" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "fulfillmentMethod" TEXT NOT NULL DEFAULT 'SHIP',
  ADD COLUMN IF NOT EXISTS "pickupWarehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupReadyAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "b2bCompanyId" TEXT;

ALTER TABLE "Warehouse"
  ADD COLUMN IF NOT EXISTS "address1" TEXT,
  ADD COLUMN IF NOT EXISTS "address2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "postal" TEXT,
  ADD COLUMN IF NOT EXISTS "country" CHAR(2),
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pickupInstructions" TEXT;

CREATE TABLE IF NOT EXISTS "MetaobjectDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fieldDefs" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "MetaobjectDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Metaobject" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "fields" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Metaobject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Metafield" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerType" "MetafieldOwnerType" NOT NULL,
  "ownerId" TEXT NOT NULL,
  "namespace" TEXT NOT NULL DEFAULT 'custom',
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'single_line_text',
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Metafield_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReturnRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "rmaCode" TEXT NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "isExchange" BOOLEAN NOT NULL DEFAULT false,
  "exchangeProductId" TEXT,
  "exchangeVariantId" TEXT,
  "labelUrl" TEXT,
  "trackingNumber" TEXT,
  "refundAmountCents" INTEGER,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReturnLineItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "orderLineItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  CONSTRAINT "ReturnLineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "B2bPriceList" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "B2bPriceList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "B2bPriceListItem" (
  "id" TEXT NOT NULL,
  "priceListId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "priceAmount" INTEGER NOT NULL,
  CONSTRAINT "B2bPriceListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "B2bCompany" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "B2bCompanyStatus" NOT NULL DEFAULT 'PENDING',
  "paymentTermsDays" INTEGER,
  "note" TEXT,
  "priceListId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "B2bCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "B2bBuyer" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "B2bBuyerRole" NOT NULL DEFAULT 'BUYER',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "B2bBuyer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT,
  "stripeSubscriptionId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "status" "ProductSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "interval" TEXT NOT NULL,
  "currentPeriodEnd" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ProductSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetaobjectDefinition_tenantId_type_key" ON "MetaobjectDefinition"("tenantId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "Metaobject_tenantId_definitionId_handle_key" ON "Metaobject"("tenantId", "definitionId", "handle");
CREATE UNIQUE INDEX IF NOT EXISTS "Metafield_tenantId_ownerType_ownerId_namespace_key_key" ON "Metafield"("tenantId", "ownerType", "ownerId", "namespace", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "ReturnRequest_tenantId_rmaCode_key" ON "ReturnRequest"("tenantId", "rmaCode");
CREATE UNIQUE INDEX IF NOT EXISTS "B2bPriceListItem_priceListId_productId_variantId_key" ON "B2bPriceListItem"("priceListId", "productId", "variantId");
CREATE UNIQUE INDEX IF NOT EXISTS "B2bBuyer_customerId_key" ON "B2bBuyer"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductSubscription_stripeSubscriptionId_key" ON "ProductSubscription"("stripeSubscriptionId");

DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_b2bCompanyId_fkey"
    FOREIGN KEY ("b2bCompanyId") REFERENCES "B2bCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupWarehouseId_fkey"
    FOREIGN KEY ("pickupWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_b2bCompanyId_fkey"
    FOREIGN KEY ("b2bCompanyId") REFERENCES "B2bCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MetaobjectDefinition" ADD CONSTRAINT "MetaobjectDefinition_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Metaobject" ADD CONSTRAINT "Metaobject_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Metaobject" ADD CONSTRAINT "Metaobject_definitionId_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "MetaobjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Metafield" ADD CONSTRAINT "Metafield_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnLineItem" ADD CONSTRAINT "ReturnLineItem_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnLineItem" ADD CONSTRAINT "ReturnLineItem_orderLineItemId_fkey"
    FOREIGN KEY ("orderLineItemId") REFERENCES "OrderLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bPriceList" ADD CONSTRAINT "B2bPriceList_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bPriceListItem" ADD CONSTRAINT "B2bPriceListItem_priceListId_fkey"
    FOREIGN KEY ("priceListId") REFERENCES "B2bPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bPriceListItem" ADD CONSTRAINT "B2bPriceListItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bCompany" ADD CONSTRAINT "B2bCompany_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bCompany" ADD CONSTRAINT "B2bCompany_priceListId_fkey"
    FOREIGN KEY ("priceListId") REFERENCES "B2bPriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bBuyer" ADD CONSTRAINT "B2bBuyer_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "B2bCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "B2bBuyer" ADD CONSTRAINT "B2bBuyer_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSubscription" ADD CONSTRAINT "ProductSubscription_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSubscription" ADD CONSTRAINT "ProductSubscription_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSubscription" ADD CONSTRAINT "ProductSubscription_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSubscription" ADD CONSTRAINT "ProductSubscription_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
