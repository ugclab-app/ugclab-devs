-- Markets + display FX on StoreSettings
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "localeCurrencies" JSONB;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "markets" JSONB;
