-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core schema: roles, permissions, businesses, stores, user profiles, business members
CREATE SCHEMA "core";

-- Roles: application roles for RBAC
CREATE TABLE "core"."Roles" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "Rank" integer NOT NULL DEFAULT 0,
    "IsSystem" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Roles_Name_key" UNIQUE ("Name"),
    CONSTRAINT "Roles_Rank_check" CHECK ("Rank" >= 0)
);
CREATE INDEX "Roles_Rank_idx" ON "core"."Roles" ("Rank");

-- Permissions: granular permissions for RBAC
CREATE TABLE "core"."Permissions" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "Module" text NOT NULL,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Permissions_Name_key" UNIQUE ("Name")
);
CREATE INDEX "Permissions_Module_idx" ON "core"."Permissions" ("Module");

-- RolePermissions: many-to-many mapping of roles to permissions
CREATE TABLE "core"."RolePermissions" (
    "RoleCode" text NOT NULL REFERENCES "core"."Roles"("Code") ON DELETE CASCADE,
    "PermissionCode" text NOT NULL REFERENCES "core"."Permissions"("Code") ON DELETE CASCADE,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("RoleCode", "PermissionCode")
);
CREATE INDEX "RolePermissions_RoleCode_idx" ON "core"."RolePermissions" ("RoleCode");
CREATE INDEX "RolePermissions_PermissionCode_idx" ON "core"."RolePermissions" ("PermissionCode");

-- Businesses: business entities (single or multi-business)
CREATE TABLE "core"."Businesses" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "Name" text NOT NULL,
    "Slug" text NOT NULL,
    "LegalName" text,
    "TaxId" text,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "OwnerUserId" text,
    "Status" text NOT NULL DEFAULT 'active',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Businesses_Slug_key" UNIQUE ("Slug"),
    CONSTRAINT "Businesses_Status_check" CHECK ("Status" IN ('active', 'suspended', 'archived'))
);
CREATE INDEX "Businesses_Status_idx" ON "core"."Businesses" ("Status");

-- Stores: outlets/locations belonging to a business
CREATE TABLE "core"."Stores" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Code" text NOT NULL,
    "Address" text,
    "Phone" text,
    "Email" text,
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Stores_BusinessId_Code_key" UNIQUE ("BusinessId", "Code")
);
CREATE INDEX "Stores_BusinessId_idx" ON "core"."Stores" ("BusinessId");
CREATE INDEX "Stores_IsActive_idx" ON "core"."Stores" ("IsActive");

-- UserProfiles: application profile linking to Supabase Auth user
-- Primary key matches auth.users(id) for direct FK relationship.
CREATE TABLE "core"."UserProfiles" (
    "Id" uuid PRIMARY KEY NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "Name" text,
    "Email" text,
    "Role" text NOT NULL DEFAULT 'user' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone
);
CREATE INDEX "UserProfiles_Role_idx" ON "core"."UserProfiles" ("Role");
CREATE INDEX "UserProfiles_Email_idx" ON "core"."UserProfiles" ("Email");

-- Enable RLS on UserProfiles
ALTER TABLE "core"."UserProfiles" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own profile
CREATE POLICY "user_profiles_select_own" ON "core"."UserProfiles"
    FOR SELECT TO authenticated
    USING (auth.uid() = "Id");

-- Policy: authenticated users can insert their own profile
CREATE POLICY "user_profiles_insert_own" ON "core"."UserProfiles"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = "Id");

-- Policy: authenticated users can update their own profile
CREATE POLICY "user_profiles_update_own" ON "core"."UserProfiles"
    FOR UPDATE TO authenticated
    USING (auth.uid() = "Id")
    WITH CHECK (auth.uid() = "Id");

-- Grant minimum permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON "core"."UserProfiles" TO authenticated;

-- BusinessMembers: user membership in a business with role and optional store access
CREATE TABLE "core"."BusinessMembers" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "UserId" text NOT NULL,
    "Role" text NOT NULL DEFAULT 'user' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "StoreId" uuid REFERENCES "core"."Stores"("Id") ON DELETE SET NULL,
    "Status" text NOT NULL DEFAULT 'active',
    "InvitedAt" timestamp with time zone,
    "JoinedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "BusinessMembers_BusinessId_UserId_key" UNIQUE ("BusinessId", "UserId"),
    CONSTRAINT "BusinessMembers_Status_check" CHECK ("Status" IN ('invited', 'active', 'suspended', 'removed'))
);
CREATE INDEX "BusinessMembers_BusinessId_idx" ON "core"."BusinessMembers" ("BusinessId");
CREATE INDEX "BusinessMembers_UserId_idx" ON "core"."BusinessMembers" ("UserId");
CREATE INDEX "BusinessMembers_StoreId_idx" ON "core"."BusinessMembers" ("StoreId");

-- DiningTables: QR table/location tokens. Raw token is never stored; only hash.
CREATE TABLE "core"."DiningTables" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "TableNumber" text,
    "Name" text,
    "QrType" text NOT NULL DEFAULT 'TABLE',
    "QrTokenHash" text NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "DiningTables_QrTokenHash_key" UNIQUE ("QrTokenHash"),
    CONSTRAINT "DiningTables_StoreId_TableNumber_key" UNIQUE ("StoreId", "TableNumber"),
    CONSTRAINT "DiningTables_QrType_check" CHECK ("QrType" IN ('TABLE', 'GENERAL'))
);
CREATE INDEX "DiningTables_BusinessId_idx" ON "core"."DiningTables" ("BusinessId");
CREATE INDEX "DiningTables_StoreId_idx" ON "core"."DiningTables" ("StoreId");
CREATE INDEX "DiningTables_IsActive_idx" ON "core"."DiningTables" ("IsActive");
CREATE INDEX "DiningTables_QrType_idx" ON "core"."DiningTables" ("QrType");