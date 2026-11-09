-- ============================================================
-- PENDING MIGRATIONS FOR SUPABASE DASHBOARD (MANUAL APPLY)
-- Run these in order in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. CORE SCHEMA: Helper functions for RLS (SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "core"."is_business_member"(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "core"."BusinessMembers"
    WHERE "BusinessId" = p_business_id
      AND "UserId" = auth.uid()::text
      AND "Status" = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION "core"."has_business_role"(p_business_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "core"."BusinessMembers"
    WHERE "BusinessId" = p_business_id
      AND "UserId" = auth.uid()::text
      AND "Status" = 'active'
      AND "Role" = p_role
  );
$$;

-- ------------------------------------------------------------
-- 2. CORE SCHEMA: RLS Policies (Multi-tenant isolation)
-- ------------------------------------------------------------

-- Helper: drop policy if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Businesses' AND policyname = 'businesses_select_member') THEN
    DROP POLICY "businesses_select_member" ON "core"."Businesses";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Businesses' AND policyname = 'businesses_insert_owner') THEN
    DROP POLICY "businesses_insert_owner" ON "core"."Businesses";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Businesses' AND policyname = 'businesses_update_admin') THEN
    DROP POLICY "businesses_update_admin" ON "core"."Businesses";
  END IF;
END $$;

-- Businesses RLS
ALTER TABLE "core"."Businesses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_select_member" ON "core"."Businesses"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("Id"));

CREATE POLICY "businesses_insert_owner" ON "core"."Businesses"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "OwnerUserId");

CREATE POLICY "businesses_update_admin" ON "core"."Businesses"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("Id", 'owner') OR "core"."has_business_role"("Id", 'admin'))
    WITH CHECK ("core"."has_business_role"("Id", 'owner') OR "core"."has_business_role"("Id", 'admin'));

-- Stores RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Stores' AND policyname = 'stores_select_member') THEN
    DROP POLICY "stores_select_member" ON "core"."Stores";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Stores' AND policyname = 'stores_insert_admin') THEN
    DROP POLICY "stores_insert_admin" ON "core"."Stores";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'Stores' AND policyname = 'stores_update_admin') THEN
    DROP POLICY "stores_update_admin" ON "core"."Stores";
  END IF;
END $$;

ALTER TABLE "core"."Stores" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_member" ON "core"."Stores"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

CREATE POLICY "stores_insert_admin" ON "core"."Stores"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

CREATE POLICY "stores_update_admin" ON "core"."Stores"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

-- BusinessMembers RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'BusinessMembers' AND policyname = 'business_members_select_own') THEN
    DROP POLICY "business_members_select_own" ON "core"."BusinessMembers";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'BusinessMembers' AND policyname = 'business_members_select_admin') THEN
    DROP POLICY "business_members_select_admin" ON "core"."BusinessMembers";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'BusinessMembers' AND policyname = 'business_members_insert_owner') THEN
    DROP POLICY "business_members_insert_owner" ON "core"."BusinessMembers";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'BusinessMembers' AND policyname = 'business_members_update_admin') THEN
    DROP POLICY "business_members_update_admin" ON "core"."BusinessMembers";
  END IF;
END $$;

ALTER TABLE "core"."BusinessMembers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_members_select_own" ON "core"."BusinessMembers"
    FOR SELECT TO authenticated
    USING ("UserId" = auth.uid()::text);

CREATE POLICY "business_members_select_admin" ON "core"."BusinessMembers"
    FOR SELECT TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

CREATE POLICY "business_members_insert_owner" ON "core"."BusinessMembers"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner'));

CREATE POLICY "business_members_update_admin" ON "core"."BusinessMembers"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

-- DiningTables RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'DiningTables' AND policyname = 'dining_tables_select_member') THEN
    DROP POLICY "dining_tables_select_member" ON "core"."DiningTables";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'DiningTables' AND policyname = 'dining_tables_insert_manager') THEN
    DROP POLICY "dining_tables_insert_manager" ON "core"."DiningTables";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'DiningTables' AND policyname = 'dining_tables_update_manager') THEN
    DROP POLICY "dining_tables_update_manager" ON "core"."DiningTables";
  END IF;
END $$;

ALTER TABLE "core"."DiningTables" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dining_tables_select_member" ON "core"."DiningTables"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

CREATE POLICY "dining_tables_insert_manager" ON "core"."DiningTables"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

CREATE POLICY "dining_tables_update_manager" ON "core"."DiningTables"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- ------------------------------------------------------------
-- 3. CORE SCHEMA: Seed 'free' role (idempotent)
-- ------------------------------------------------------------
INSERT INTO "core"."Roles" ("Code", "Name", "Description", "Rank", "IsSystem") VALUES
    ('free', 'Free', 'Free tier - limited features', 0, true),
    ('user', 'User', 'Akun dasar', 0, true),
    ('cashier', 'Cashier', 'Kasir', 1, true),
    ('manager', 'Manager', 'Manajer', 2, true),
    ('admin', 'Admin', 'Administrator', 3, true),
    ('owner', 'Owner', 'Pemilik bisnis', 4, true)
ON CONFLICT ("Code") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "Rank" = EXCLUDED."Rank",
    "IsSystem" = EXCLUDED."IsSystem",
    "UpdatedAt" = now();

-- ------------------------------------------------------------
-- 4. USERPROFILES: Add Phone and AvatarUrl columns
-- ------------------------------------------------------------
ALTER TABLE "core"."UserProfiles" ADD COLUMN IF NOT EXISTS "Phone" text;
ALTER TABLE "core"."UserProfiles" ADD COLUMN IF NOT EXISTS "AvatarUrl" text;

CREATE INDEX IF NOT EXISTS "UserProfiles_Phone_idx" ON "core"."UserProfiles" ("Phone");

-- ------------------------------------------------------------
-- 5. TRANSACTIONS: Add STOREFRONT to OrderSource check constraint
-- ------------------------------------------------------------
-- Drop and recreate the check constraint to include 'STOREFRONT'
ALTER TABLE "transactions"."Orders" DROP CONSTRAINT IF EXISTS "Orders_OrderSource_check";
ALTER TABLE "transactions"."Orders" ADD CONSTRAINT "Orders_OrderSource_check" CHECK ("OrderSource" IN ('POS', 'QR_TABLE', 'QR_GENERAL', 'STOREFRONT'));

-- ------------------------------------------------------------
-- 6. OTHER SCHEMA RLS POLICIES (apply per schema as needed)
-- ------------------------------------------------------------
-- Note: The init.sql only has RLS on UserProfiles. Other schemas
-- (customers, products, staff, suppliers, purchases, transactions,
-- inventory, payments, lookups, settings, platform) need RLS
-- policies applied using the same pattern with is_business_member()
-- and has_business_role() helpers.

-- Example pattern for other schemas (run per schema):
-- ALTER TABLE "schema"."Table" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "table_select_member" ON "schema"."Table"
--     FOR SELECT TO authenticated
--     USING ("core"."is_business_member"("BusinessId"));
-- CREATE POLICY "table_insert_admin" ON "schema"."Table"
--     FOR INSERT TO authenticated
--     WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));
-- CREATE POLICY "table_update_admin" ON "schema"."Table"
--     FOR UPDATE TO authenticated
--     USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
--     WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

-- ------------------------------------------------------------
-- 6. PLATFORM SCHEMA: Seed plans (run after platform.sql applied)
-- ------------------------------------------------------------
-- This is handled by: bun db:seed:platform
-- But you can also run the seed SQL manually if needed.

-- ============================================================
-- VERIFICATION QUERIES (run after applying)
-- ============================================================
-- Check helper functions exist:
-- SELECT * FROM pg_proc WHERE proname IN ('is_business_member', 'has_business_role') AND pronamespace = 'core'::regnamespace;

-- Check roles:
-- SELECT * FROM "core"."Roles" ORDER BY "Rank";

-- Check UserProfiles columns:
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'UserProfiles';

-- Check RLS policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname IN ('core', 'customers', 'products', 'staff', 'suppliers', 'purchases', 'transactions', 'inventory', 'payments', 'lookups', 'settings', 'platform');