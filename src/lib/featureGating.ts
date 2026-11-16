import { and, eq } from "drizzle-orm";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { db } from "@/server/db";
import { subscriptions, plans } from "@/server/db/schema/platform";

export type PlanEntitlements = {
  maxUsers?: number;
  maxStores?: number;
  maxProducts?: number;
  features?: string[];
};

const FREE_ENTITLEMENTS: PlanEntitlements =
  PLAN_DEFINITIONS.find((plan) => plan.tier === "free")?.entitlements ?? {
    maxUsers: 3,
    maxStores: 1,
    maxProducts: 50,
    features: ["pos", "pos_basic", "reports", "multi_store", "api"],
  };

async function getActivePlanEntitlements(businessId: string): Promise<PlanEntitlements | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.businessId, businessId),
      eq(subscriptions.status, "active")
    ),
  });

  if (!subscription) {
    return FREE_ENTITLEMENTS;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, subscription.planId),
  });

  if (!plan?.entitlements) {
    return null;
  }

  return plan.entitlements as PlanEntitlements;
}

export async function checkFeatureAccess(businessId: string, feature: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  const entitlements = await getActivePlanEntitlements(businessId);
  const features = entitlements?.features ?? [];

  if (features.length === 0) {
    return { allowed: true };
  }

  const allowed = features.includes(feature);

  return {
    allowed,
    message: allowed ? undefined : `Fitur "${feature}" tidak tersedia pada paket Anda. Upgrade untuk mengakses.`,
  };
}

export async function enforceFeatureAccess(businessId: string, feature: string): Promise<void> {
  const check = await checkFeatureAccess(businessId, feature);
  if (!check.allowed) {
    throw new Error(check.message || `Fitur "${feature}" tidak tersedia pada paket Anda.`);
  }
}
