-- Store GPS coordinates for accurate "nearest store" discovery. ADDITIVE ONLY.
ALTER TABLE "core"."Stores"
  ADD COLUMN IF NOT EXISTS "Latitude" double precision;

ALTER TABLE "core"."Stores"
  ADD COLUMN IF NOT EXISTS "Longitude" double precision;