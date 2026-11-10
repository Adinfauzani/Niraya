-- Phase 8G.2 (ADDITIVE, dev branch): platform-wide maintenance configuration.
-- Single row (Id="default") toggles maintenance mode for the whole platform.
-- Status route reads this; config route upserts it. Missing table must not 500
-- the status endpoint, so the route falls back to a disabled default.

CREATE TABLE IF NOT EXISTS "platform"."MaintenanceConfig" (
    "Id" text PRIMARY KEY DEFAULT 'default',
    "Enabled" boolean NOT NULL DEFAULT false,
    "Message" text,
    "StartedAt" timestamp with time zone,
    "EstimatedEndAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);