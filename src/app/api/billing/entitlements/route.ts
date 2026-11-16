import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

import { getBusinessEntitlements, hasActiveEntitlement } from "@/server/billing/SubscriptionReconciliation";
import { requireTenantContext } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await getSession();
    const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const tenant = await requireTenantContext(user.id);
    const entitlements = await getBusinessEntitlements(tenant.businessId);
    
    if (!entitlements) {
      return NextResponse.json({ 
        hasSubscription: false,
        entitlements: null,
        features: [],
        limits: {
          maxUsers: 3,
          maxStores: 1,
          maxProducts: 10,
        }
      });
    }
    
    return NextResponse.json({
      hasSubscription: true,
      entitlements,
      features: entitlements.features ?? [],
      limits: {
        maxUsers: entitlements.maxUsers ?? 3,
        maxStores: entitlements.maxStores ?? 1,
        maxProducts: entitlements.maxProducts ?? 10,
      }
    });
  } catch (error) {
    console.error("Entitlements check failed:", error);
    return NextResponse.json({ error: "Failed to check entitlements" }, { status: 500 });
  }
}