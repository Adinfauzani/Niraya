-- Platform schema: SaaS plans, subscriptions, and provider webhook events.
-- Gumroad remains the source of truth for billing; these tables mirror
-- subscription state locally for entitlements and audit.
CREATE SCHEMA "platform";

-- Plans: one row per Gumroad price/product mapping.
CREATE TABLE "platform"."Plans" (
    "Id" text PRIMARY KEY NOT NULL,
    "Code" text NOT NULL,
    "Name" text NOT NULL,
    "Tier" text NOT NULL,
    "Recurrence" text NOT NULL,
    "IntervalMonths" integer NOT NULL,
    "GumroadProductId" text,
    "PriceCents" integer NOT NULL,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Entitlements" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Plans_Code_key" UNIQUE ("Code"),
    CONSTRAINT "Plans_GumroadProductId_key" UNIQUE ("GumroadProductId"),
    CONSTRAINT "Plans_Recurrence_check" CHECK ("Recurrence" IN ('monthly', 'quarterly', 'biannually', 'yearly')),
    CONSTRAINT "Plans_IntervalMonths_check" CHECK ("IntervalMonths" > 0),
    CONSTRAINT "Plans_PriceCents_check" CHECK ("PriceCents" >= 0)
);
CREATE INDEX "Plans_Tier_idx" ON "platform"."Plans" ("Tier");
CREATE INDEX "Plans_Recurrence_idx" ON "platform"."Plans" ("Recurrence");

-- Subscriptions: local mirror of a Gumroad membership.
-- BusinessId is nullable until the buyer claims the subscription.
CREATE TABLE "platform"."Subscriptions" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid REFERENCES "core"."Businesses"("Id") ON DELETE SET NULL,
    "Provider" text NOT NULL DEFAULT 'gumroad',
    "ProviderSubscriptionId" text NOT NULL,
    "ProviderUserId" text,
    "PurchaserEmail" text NOT NULL,
    "PlanId" text NOT NULL REFERENCES "platform"."Plans"("Id") ON DELETE RESTRICT,
    "Status" text NOT NULL DEFAULT 'active',
    "Recurrence" text,
    "Quantity" integer NOT NULL DEFAULT 1,
    "StartedAt" timestamp with time zone,
    "CurrentPeriodEnd" timestamp with time zone,
    "CancelAt" timestamp with time zone,
    "EndedAt" timestamp with time zone,
    "LastEventAt" timestamp with time zone,
    "ClaimedAt" timestamp with time zone,
    "ClaimedByUserId" text,
    "Raw" jsonb,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Subscriptions_Provider_Subscription_key" UNIQUE ("Provider", "ProviderSubscriptionId"),
    CONSTRAINT "Subscriptions_Status_check" CHECK ("Status" IN ('active', 'cancel_at_period_end', 'ended', 'refunded', 'disputed', 'past_due')),
    CONSTRAINT "Subscriptions_Quantity_check" CHECK ("Quantity" > 0)
);
CREATE INDEX "Subscriptions_BusinessId_idx" ON "platform"."Subscriptions" ("BusinessId");
CREATE INDEX "Subscriptions_PurchaserEmail_idx" ON "platform"."Subscriptions" ("PurchaserEmail");
CREATE INDEX "Subscriptions_Status_idx" ON "platform"."Subscriptions" ("Status");

-- WebhookEvents: raw Gumroad payloads for idempotency and replay.
CREATE TABLE "platform"."WebhookEvents" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "Provider" text NOT NULL DEFAULT 'gumroad',
    "Resource" text NOT NULL,
    "EventKey" text NOT NULL,
    "ProviderSubscriptionId" text,
    "SaleId" text,
    "Payload" jsonb NOT NULL,
    "Status" text NOT NULL DEFAULT 'received',
    "Error" text,
    "ReceivedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ProcessedAt" timestamp with time zone,
    CONSTRAINT "WebhookEvents_Provider_EventKey_key" UNIQUE ("Provider", "EventKey"),
    CONSTRAINT "WebhookEvents_Status_check" CHECK ("Status" IN ('received', 'processed', 'failed', 'ignored'))
);
CREATE INDEX "WebhookEvents_ProviderSubscriptionId_idx" ON "platform"."WebhookEvents" ("ProviderSubscriptionId");
CREATE INDEX "WebhookEvents_Status_idx" ON "platform"."WebhookEvents" ("Status");
