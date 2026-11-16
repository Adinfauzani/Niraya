import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

import { getSubscriptionByEmail, claimSubscription, getActiveSubscription, getBusinessEntitlements } from "@/server/billing/SubscriptionReconciliation";
import { requireTenantContext } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getSession();
    const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
    
    if (!user?.id || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const tenant = await requireTenantContext(user.id);
    
    // Check if business already has active subscription
    const existing = await getActiveSubscription(tenant.businessId);
    if (existing) {
      return NextResponse.json({ ok: true, alreadyActive: true, subscription: existing });
    }
    
    // Look for subscription by email
    const subscription = await getSubscriptionByEmail(user.email);
    if (!subscription) {
      return NextResponse.json({ ok: true, claimed: false, reason: "No subscription found for this email" });
    }
    
    // Claim the subscription
    await claimSubscription(subscription.id, tenant.businessId, user.id);
    
    return NextResponse.json({ ok: true, claimed: true, subscription });
  } catch (error) {
    console.error("Claim subscription failed:", error);
    return NextResponse.json({ error: "Failed to claim subscription" }, { status: 500 });
  }
}