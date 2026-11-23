-- Add PaymentExpiryMinutes to settings tables (OperationalSettings + legacy BusinessSettings)
-- Default 10 minutes for payment proof deadline on storefront orders.

ALTER TABLE "settings"."OperationalSettings"
  ADD COLUMN IF NOT EXISTS "PaymentExpiryMinutes" integer NOT NULL DEFAULT 10;

ALTER TABLE "settings"."BusinessSettings"
  ADD COLUMN IF NOT EXISTS "PaymentExpiryMinutes" integer NOT NULL DEFAULT 10;
