-- Add QRIS image for manual transfer (storefront payment instructions). ADDITIVE ONLY.
ALTER TABLE "settings"."BusinessSettings"
  ADD COLUMN IF NOT EXISTS "ManualTransferQrisImageUrl" text;

ALTER TABLE "settings"."PaymentSettings"
  ADD COLUMN IF NOT EXISTS "ManualTransferQrisImageUrl" text;
