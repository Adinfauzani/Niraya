import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  businessMembers,
  plans,
  subscriptions,
  type PlanEntitlements,
} from "@/server/db/schema";

export const USABLE_SUBSCRIPTION_STATUSES = [
  "active",
  "cancel_at_period_end",
] as const;

/** Toleransi webhook terlambat sebelum akses dicabut. */
const PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type BillingSummary = {
  businessId: string | null;
  subscription: {
    id: string;
    planId: string;
    planName: string;
    tier: string;
    status: string;
    recurrence: string | null;
    currentPeriodEnd: Date | null;
    cancelAt: Date | null;
    endedAt: Date | null;
    usable: boolean;
  } | null;
  entitlements: PlanEntitlements | null;
  unclaimed: Array<{
    id: string;
    planId: string;
    planName: string;
    purchaserEmail: string;
    status: string;
    currentPeriodEnd: Date | null;
    createdAt: Date;
  }>;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSubscriptionUsable(subscription: {
  status: string;
  currentPeriodEnd: Date | null;
  endedAt: Date | null;
}): boolean {
  if (
    !USABLE_SUBSCRIPTION_STATUSES.includes(
      subscription.status as (typeof USABLE_SUBSCRIPTION_STATUSES)[number]
    )
  ) {
    return false;
  }
  if (subscription.endedAt) return false;
  if (!subscription.currentPeriodEnd) return true;
  return (
    subscription.currentPeriodEnd.getTime() + PERIOD_GRACE_MS >= Date.now()
  );
}

/** Bisnis utama user: prioritaskan owner/admin, lalu anggota aktif mana pun. */
export async function getPrimaryBusinessForUser(userId: string) {
  const [owned] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.status, "active"),
        inArray(businessMembers.role, ["owner", "admin"])
      )
    )
    .orderBy(businessMembers.createdAt)
    .limit(1);

  if (owned) return owned;

  const [member] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.status, "active")
      )
    )
    .orderBy(businessMembers.createdAt)
    .limit(1);

  return member ?? null;
}

export async function getActiveSubscriptionForBusiness(businessId: string) {
  const [row] = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.businessId, businessId),
        inArray(subscriptions.status, [...USABLE_SUBSCRIPTION_STATUSES])
      )
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);

  return row ?? null;
}

/** Entitlement efektif; null berarti tidak ada langganan yang bisa dipakai. */
export async function resolveEntitlements(
  businessId: string
): Promise<PlanEntitlements | null> {
  const row = await getActiveSubscriptionForBusiness(businessId);
  if (!row) return null;
  if (!isSubscriptionUsable(row.subscription)) return null;
  return row.plan.entitlements ?? null;
}

export async function getBillingSummaryForUser(
  userId: string,
  email: string | null
): Promise<BillingSummary> {
  const member = await getPrimaryBusinessForUser(userId);
  const businessId = member?.businessId ?? null;
  const active = businessId
    ? await getActiveSubscriptionForBusiness(businessId)
    : null;

  const normalizedEmail = email ? normalizeEmail(email) : null;
  const unclaimed = normalizedEmail
    ? await db
        .select({
          id: subscriptions.id,
          planId: subscriptions.planId,
          planName: plans.name,
          purchaserEmail: subscriptions.purchaserEmail,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            sql`lower(${subscriptions.purchaserEmail}) = ${normalizedEmail}`,
            isNull(subscriptions.businessId)
          )
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(10)
    : [];

  return {
    businessId,
    subscription: active
      ? {
          id: active.subscription.id,
          planId: active.plan.id,
          planName: active.plan.name,
          tier: active.plan.tier,
          status: active.subscription.status,
          recurrence: active.subscription.recurrence,
          currentPeriodEnd: active.subscription.currentPeriodEnd,
          cancelAt: active.subscription.cancelAt,
          endedAt: active.subscription.endedAt,
          usable: isSubscriptionUsable(active.subscription),
        }
      : null,
    entitlements:
      active && isSubscriptionUsable(active.subscription)
        ? active.plan.entitlements ?? null
        : null,
    unclaimed,
  };
}

/**
 * Klaim langganan yang belum terikat bisnis berdasarkan email pembeli.
 * Dipanggil setelah user punya bisnis (onboarding).
 */
export async function claimSubscriptionsForUser(
  userId: string,
  email: string,
  businessId: string
): Promise<number> {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const updated = await db
    .update(subscriptions)
    .set({
      businessId,
      claimedAt: now,
      claimedByUserId: userId,
      updatedAt: now,
    })
    .where(
      and(
        sql`lower(${subscriptions.purchaserEmail}) = ${normalizedEmail}`,
        isNull(subscriptions.businessId)
      )
    )
    .returning({ id: subscriptions.id });

  return updated.length;
}
