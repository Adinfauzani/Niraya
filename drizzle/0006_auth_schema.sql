-- 0006_auth_schema.sql
-- Better Auth 1.7.x database schema.
-- Tables live in the dedicated `auth` schema, separate from the 13
-- business domain schemas.
--
-- This migration is additive and idempotent (IF NOT EXISTS).
-- Apply manually on a dev branch; `bun db:migrate` will not replay it
-- because `drizzle/meta/_journal.json` only knows 0000.

CREATE SCHEMA IF NOT EXISTS "auth";

-- Better Auth `user` table
CREATE TABLE IF NOT EXISTS "auth"."user" (
    "id" varchar(36) PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS "auth"."session" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" varchar(36) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token" text NOT NULL UNIQUE,
    "ip_address" text,
    "user_agent" text
);

-- Better Auth `account` table (OAuth + password credentials)
CREATE TABLE IF NOT EXISTS "auth"."account" (
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

-- Better Auth `verification` table (email verification, password reset)
CREATE TABLE IF NOT EXISTS "auth"."verification" (
    "id" varchar(36) PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "identifier" text NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "auth_session_user_id_idx" ON "auth"."session" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_account_user_id_idx" ON "auth"."account" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_account_provider_idx" ON "auth"."account" ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "auth_verification_identifier_idx" ON "auth"."verification" ("identifier");
CREATE INDEX IF NOT EXISTS "auth_user_legacy_supabase_idx" ON "auth"."user" ("legacy_supabase_user_id");