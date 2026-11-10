import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { subscriptions, webhookEvents, plans, businesses, userProfiles } from "@/server/db/schema";

export type PlanEntitlements = {
  maxUsers?: number;
  maxStores?: number;
  maxProducts?: number;
  features?: string[];
};

export interface SubscriptionWithPlan {
  id: string;
  businessId: string | null;
  provider: string;
  providerSubscriptionId: string;
  purchaserEmail: string;
  planId: string;
  status: string;
  recurrence: string | null;
  currentPeriodEnd: Date | null;
  plan: {
    id: string;
    code: string;
    name: string;
    tier: string;
    entitlements: PlanEntitlements;
  };
}

/**
 * Get active subscription for a business with plan details
 */
export async function getActiveSubscription(businessId: string): Promise<SubscriptionWithPlan | null> {
  const result = await db
    .select({
      id: subscriptions.id,
      businessId: subscriptions.businessId,
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      purchaserEmail: subscriptions.purchaserEmail,
      planId: subscriptions.planId,
      status: subscriptions.status,
      recurrence: subscriptions.recurrence,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      plan: {
        id: plans.id,
        code: plans.code,
        name: plans.name,
        tier: plans.tier,
        entitlements: plans.entitlements,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.businessId, businessId),
        eq(subscriptions.status, "active"),
        eq(plans.isActive, true)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get active subscription by purchaser email (for claiming)
 */
export async function getSubscriptionByEmail(email: string): Promise<SubscriptionWithPlan | null> {
  const result = await db
    .select({
      id: subscriptions.id,
      businessId: subscriptions.businessId,
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      purchaserEmail: subscriptions.purchaserEmail,
      planId: subscriptions.planId,
      status: subscriptions.status,
      recurrence: subscriptions.recurrence,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      plan: {
        id: plans.id,
        code: plans.code,
        name: plans.name,
        tier: plans.tier,
        entitlements: plans.entitlements,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.purchaserEmail, email),
        eq(subscriptions.status, "active"),
        eq(plans.isActive, true)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Claim a subscription for a business (when user logs in with purchase email)
 */
export async function claimSubscription(
  subscriptionId: string,
  businessId: string,
  userId: string
): Promise<{ ok: true }> {
  await db
    .update(subscriptions)
    .set({
      businessId,
      claimedAt: new Date(),
      claimedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        isNull(subscriptions.businessId)
      )
    );

  return { ok: true };
}

/**
 * Check if user has active subscription entitlement
 */
export async function hasActiveEntitlement(
  businessId: string,
  feature: string
): Promise<boolean> {
  const sub = await getActiveSubscription(businessId);
  if (!sub) return false;

  const entitlements = sub.plan.entitlements;
  if (!entitlements.features) return false;
  return entitlements.features.includes(feature);
}

/**
 * Get entitlements for a business
 */
export async function getBusinessEntitlements(businessId: string): Promise<PlanEntitlements | null> {
  const sub = await getActiveSubscription(businessId);
  if (!sub) return null;
  return sub.plan.entitlements;
}

/**
 * Reconcile subscriptions from Gumroad webhook events
 * This processes unprocessed webhook events and updates local subscription state
 */
export async function reconcileSubscriptions(): Promise<{ processed: number; failed: number }> {
  const events = await db
    .select()
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, "gumroad"),
        eq(webhookEvents.status, "received")
      )
    )
    .orderBy(webhookEvents.receivedAt);

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await processWebhookEvent(event);
      await db
        .update(webhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      processed++;
    } catch (error) {
      console.error("Webhook processing failed:", error);
      await db
        .update(webhookEvents)
        .set({ status: "failed", error: String(error), processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Process a single Gumroad webhook event
 */
async function processWebhookEvent(event: typeof webhookEvents.$inferSelect): Promise<void> {
  const payload = event.payload as Record<string, unknown>;
  const resource = event.resource as string;

  if (resource === "subscription" || resource === "subscription_payment") {
    await handleSubscriptionEvent(payload, event.providerSubscriptionId as string);
  } else if (resource === "refund") {
    await handleRefundEvent(payload, event.providerSubscriptionId as string);
  } else if (resource === "dispute") {
    await handleDisputeEvent(payload, event.providerSubscriptionId as string);
  }
}

async function handleSubscriptionEvent(
  payload: Record<string, unknown>,
  providerSubscriptionId: string
): Promise<void> {
  const status = String(payload.status ?? "active");
  const planId = String(payload.plan_id ?? "");
  const purchaserEmail = String(payload.email ?? "");
  const currentPeriodEnd = payload.current_period_end ? new Date(String(payload.current_period_end)) : null;
  const cancelAt = payload.cancel_at ? new Date(String(payload.cancel_at)) : null;
  const endedAt = payload.ended_at ? new Date(String(payload.ended_at)) : null;

  await db
    .insert(subscriptions)
    .values({
      provider: "gumroad",
      providerSubscriptionId,
      providerUserId: payload.user_id ? String(payload.user_id) : null,
      purchaserEmail,
      planId,
      status: mapGumroadStatus(status),
      recurrence: payload.recurrence ? String(payload.recurrence) : null,
      currentPeriodEnd,
      cancelAt,
      endedAt,
      lastEventAt: new Date(),
      raw: payload,
    })
    .onConflictDoUpdate({
      target: [subscriptions.provider, subscriptions.providerSubscriptionId],
      set: {
        status: mapGumroadStatus(status),
        planId,
        currentPeriodEnd,
        cancelAt,
        endedAt,
        lastEventAt: new Date(),
        raw: payload,
        updatedAt: new Date(),
      },
    });
}

async function handleRefundEvent(
  payload: Record<string, unknown>,
  providerSubscriptionId: string
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: "refunded",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.provider, "gumroad"),
        eq(subscriptions.providerSubscriptionId, providerSubscriptionId)
      )
    );
}

async function handleDisputeEvent(
  payload: Record<string, unknown>,
  providerSubscriptionId: string
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: "disputed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.provider, "gumroad"),
        eq(subscriptions.providerSubscriptionId, providerSubscriptionId)
      )
    );
}

function mapGumroadStatus(gumroadStatus: string): string {
  switch (gumroadStatus) {
    case "active":
    case "trialing":
      return "active";
    case "cancelled":
    case "cancelled_at_period_end":
      return "cancel_at_period_end";
    case "ended":
    case "expired":
      return "ended";
    case "refunded":
      return "refunded";
    case "disputed":
      return "disputed";
    case "past_due":
      return "past_due";
    default:
      return "active";
  }
}

/**
 * Schedule periodic reconciliation (call from cron or internal job)
 */
export async function scheduleReconciliation(): Promise<void> {
  // This would be called by a cron job
  await reconcileSubscriptions();
}