-- 0008_plan_and_drop_permissions.sql
--
-- 1. Hapus tabel RBAC granular yang tidak terpakai:
--    `core."Permissions"` dan `core."RolePermissions"`.
--    Otorisasi aplikasi memakai `ACTION_ROLES` + `Roles."Rank"`, bukan tabel ini.
--
-- 2. Tambah kolom `core."UserProfiles"."Plan"` untuk memisahkan paket
--    langganan (free/starter/plus/pro) dari role bisnis (owner/admin/...).
--    Default `free`; onboarding membuat profil dengan plan `free`.
--
-- 3. Plan (free/starter/plus/pro) TIDAK ditambahkan ke `core."Roles"`.
--    Katalog plan sudah ada di `platform."Plans"` (`Tier`) dan `src/lib/plans.ts`.
--    `core."Roles"` tetap hanya role aplikasi/bisnis (user/cashier/manager/admin/owner).
--
-- Idempoten. Apply manual pada dev branch.

BEGIN;

DROP TABLE IF EXISTS "core"."RolePermissions";
DROP TABLE IF EXISTS "core"."Permissions";

ALTER TABLE "core"."UserProfiles"
    ADD COLUMN IF NOT EXISTS "Plan" text NOT NULL DEFAULT 'free';

ALTER TABLE "core"."UserProfiles"
    DROP CONSTRAINT IF EXISTS "UserProfiles_Plan_check";
ALTER TABLE "core"."UserProfiles"
    ADD CONSTRAINT "UserProfiles_Plan_check"
    CHECK ("Plan" IN ('free', 'starter', 'plus', 'pro'));

CREATE INDEX IF NOT EXISTS "UserProfiles_Plan_idx"
    ON "core"."UserProfiles" ("Plan");

COMMIT;