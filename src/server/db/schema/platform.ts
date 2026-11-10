import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { platformSchema } from "./schema";
import { businesses } from "./core";

const platform = platformSchema;

/** Batas/fitur yang didapat sebuah bisnis dari paket langganannya. */
export type PlanEntitlements = {
  maxUsers?: number;
  maxStores?: number;
  maxProducts?: number;
  features?: string[];
};

/**
 * Katalog paket SaaS. Satu baris = satu harga Gumroad.
 *
 * Untuk model "Cara A" (Starter bulanan, Plus 6 bulan, Pro tahunan),
 * setiap paket dipetakan ke satu `GumroadProductId` yang berbeda.
 */
export const plans = platform.table(
  "Plans",
  {
    id: text("Id").primaryKey(),
    code: text("Code").notNull(),
    name: text("Name").notNull(),
    tier: text("Tier").notNull(),
    recurrence: text("Recurrence").notNull(),
    intervalMonths: integer("IntervalMonths").notNull(),
    gumroadProductId: text("GumroadProductId"),
    priceCents: integer("PriceCents").notNull(),
    currency: text("Currency").notNull().default("IDR"),
    entitlements: jsonb("Entitlements")
      .$type<PlanEntitlements>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    isActive: boolean("IsActive").notNull().default(true),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("Plans_Code_key").on(t.code),
    unique("Plans_GumroadProductId_key").on(t.gumroadProductId),
    index("Plans_Tier_idx").on(t.tier),
    index("Plans_Recurrence_idx").on(t.recurrence),
    check(
      "Plans_Recurrence_check",
      sql`${t.recurrence} in ('monthly', 'quarterly', 'biannually', 'yearly')`
    ),
    check("Plans_IntervalMonths_check", sql`${t.intervalMonths} > 0`),
    check("Plans_PriceCents_check", sql`${t.priceCents} >= 0`),
  ]
);

/**
 * Langganan SaaS. Sumber kebenaran tetap Gumroad; tabel ini adalah mirror
 * lokal untuk entitlement dan audit.
 *
 * `BusinessId` sengaja nullable: pembeli bisa membayar sebelum punya akun.
 * Setelah user login dengan email yang sama, langganan diklaim ke bisnisnya.
 */
export const subscriptions = platform.table(
  "Subscriptions",
  {
    id: uuid("Id").defaultRandom().primaryKey(),
    businessId: uuid("BusinessId").references(() => businesses.id, {
      onDelete: "set null",
    }),
    provider: text("Provider").notNull().default("gumroad"),
    providerSubscriptionId: text("ProviderSubscriptionId").notNull(),
    providerUserId: text("ProviderUserId"),
    purchaserEmail: text("PurchaserEmail").notNull(),
    planId: text("PlanId")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: text("Status").notNull().default("active"),
    recurrence: text("Recurrence"),
    quantity: integer("Quantity").notNull().default(1),
    startedAt: timestamp("StartedAt", { withTimezone: true }),
    currentPeriodEnd: timestamp("CurrentPeriodEnd", { withTimezone: true }),
    cancelAt: timestamp("CancelAt", { withTimezone: true }),
    endedAt: timestamp("EndedAt", { withTimezone: true }),
    lastEventAt: timestamp("LastEventAt", { withTimezone: true }),
    claimedAt: timestamp("ClaimedAt", { withTimezone: true }),
    claimedByUserId: text("ClaimedByUserId"),
    raw: jsonb("Raw"),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("Subscriptions_Provider_Subscription_key").on(
      t.provider,
      t.providerSubscriptionId
    ),
    index("Subscriptions_BusinessId_idx").on(t.businessId),
    index("Subscriptions_PurchaserEmail_idx").on(t.purchaserEmail),
    index("Subscriptions_Status_idx").on(t.status),
    check(
      "Subscriptions_Status_check",
      sql`${t.status} in ('active', 'cancel_at_period_end', 'ended', 'refunded', 'disputed', 'past_due')`
    ),
    check("Subscriptions_Quantity_check", sql`${t.quantity} > 0`),
  ]
);

/**
 * Log webhook mentah dari Gumroad untuk idempotensi.
 *
 * Gumroad bisa mengirim event yang sama lebih dari sekali. `EventKey`
 * dibuat stabil dari resource + id transaksi/langganan.
 */
export const webhookEvents = platform.table(
  "WebhookEvents",
  {
    id: uuid("Id").defaultRandom().primaryKey(),
    provider: text("Provider").notNull().default("gumroad"),
    resource: text("Resource").notNull(),
    eventKey: text("EventKey").notNull(),
    providerSubscriptionId: text("ProviderSubscriptionId"),
    saleId: text("SaleId"),
    payload: jsonb("Payload").notNull(),
    status: text("Status").notNull().default("received"),
    error: text("Error"),
    receivedAt: timestamp("ReceivedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("ProcessedAt", { withTimezone: true }),
  },
  (t) => [
    unique("WebhookEvents_Provider_EventKey_key").on(t.provider, t.eventKey),
    index("WebhookEvents_ProviderSubscriptionId_idx").on(
      t.providerSubscriptionId
    ),
    index("WebhookEvents_Status_idx").on(t.status),
    check(
      "WebhookEvents_Status_check",
      sql`${t.status} in ('received', 'processed', 'failed', 'ignored')`
    ),
  ]
);

/**
 * Platform-wide maintenance configuration.
 * Single row (id="default") controls maintenance mode for entire platform.
 */
export const maintenanceConfig = platform.table(
  "MaintenanceConfig",
  {
    id: text("Id").primaryKey().default("default"),
    enabled: boolean("Enabled").notNull().default(false),
    message: text("Message"),
    startedAt: timestamp("StartedAt", { withTimezone: true }),
    estimatedEndAt: timestamp("EstimatedEndAt", { withTimezone: true }),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => []
);
