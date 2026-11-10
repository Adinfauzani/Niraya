-- 0006_auth_schema.sql
-- Better Auth 1.7.x database schema.
-- Tables live in the `core` schema alongside the app tables (no separate
-- `auth` schema — Supabase's built-in `auth` schema is reserved for
-- Supabase Auth and is not writable by the app role).
--
-- This migration is additive and idempotent (IF NOT EXISTS).
-- Apply manually on a dev branch; `bun db:migrate` will not replay it
-- because `drizzle/meta/_journal.json` only knows 0000.

-- Better Auth `user` table
CREATE TABLE IF NOT EXISTS "core"."AuthUser" (
    "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean DEFAULT false NOT NULL,
    "name" text NOT NULL,
    "image" text,
    -- Legacy Supabase user ID for identity mapping (nullable).
    -- Set during migration tooling; null for new users.
    "legacy_supabase_user_id" text
);

-- Better Auth `session` table
CREATE TABLE IF NOT EXISTS "core"."AuthSession" (
    "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" varchar(36) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token" text NOT NULL UNIQUE,
    "ip_address" text,
    "user_agent" text
);

-- Better Auth `account` table (OAuth + password credentials)
CREATE TABLE IF NOT EXISTS "core"."AuthAccount" (
    "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Better Auth `verification` table (email verification, password reset)
CREATE TABLE IF NOT EXISTS "core"."AuthVerification" (
    "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "identifier" text NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "AuthSession_user_id_idx" ON "core"."AuthSession" ("user_id");
CREATE INDEX IF NOT EXISTS "AuthAccount_user_id_idx" ON "core"."AuthAccount" ("user_id");
CREATE INDEX IF NOT EXISTS "AuthAccount_provider_idx" ON "core"."AuthAccount" ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "AuthVerification_identifier_idx" ON "core"."AuthVerification" ("identifier");
CREATE INDEX IF NOT EXISTS "AuthUser_legacy_supabase_idx" ON "core"."AuthUser" ("legacy_supabase_user_id");