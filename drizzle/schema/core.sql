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

-- Insert system roles (idempotent)
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


-- UserProfiles: application profile linking to a Better Auth user.
-- Primary key matches "core"."AuthUser"("id") for direct FK relationship.
CREATE TABLE "core"."UserProfiles" (
    "Id" varchar(36) PRIMARY KEY NOT NULL REFERENCES "core"."AuthUser"("id") ON DELETE CASCADE,
    "Name" text,
    "Email" text,
    "Phone" text,
    "AvatarUrl" text,
    "Role" text NOT NULL DEFAULT 'user' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone
);
CREATE INDEX "UserProfiles_Role_idx" ON "core"."UserProfiles" ("Role");
CREATE INDEX "UserProfiles_Email_idx" ON "core"."UserProfiles" ("Email");
CREATE INDEX "UserProfiles_Phone_idx" ON "core"."UserProfiles" ("Phone");

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


-- Better Auth tables (live in `core` schema alongside app tables;
-- no separate `auth` schema — Supabase's built-in `auth` schema is reserved
-- for Supabase Auth and is not writable by the app role).

CREATE TABLE IF NOT EXISTS "core"."AuthUser" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean DEFAULT false NOT NULL,
    "name" text NOT NULL,
    "image" text,
    "legacy_supabase_user_id" text
);

CREATE TABLE IF NOT EXISTS "core"."AuthSession" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" varchar(36) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token" text NOT NULL UNIQUE,
    "ip_address" text,
    "user_agent" text
);

CREATE TABLE IF NOT EXISTS "core"."AuthAccount" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "provider_id" text NOT NULL,
    "account_id" text NOT NULL,
    "user_id" varchar(36) NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp with time zone,
    "refresh_token_expires_at" timestamp with time zone,
    "scope" text,
    "password" text
);

CREATE TABLE IF NOT EXISTS "core"."AuthVerification" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "identifier" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "AuthSession_user_id_idx" ON "core"."AuthSession" ("user_id");
CREATE INDEX IF NOT EXISTS "AuthAccount_user_id_idx" ON "core"."AuthAccount" ("user_id");
CREATE INDEX IF NOT EXISTS "AuthAccount_provider_idx" ON "core"."AuthAccount" ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "AuthVerification_identifier_idx" ON "core"."AuthVerification" ("identifier");
CREATE INDEX IF NOT EXISTS "AuthUser_legacy_supabase_idx" ON "core"."AuthUser" ("legacy_supabase_user_id");
