import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { reconcileSubscriptions } from "@/server/billing/SubscriptionReconciliation";

export const runtime = "nodejs";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

export async function POST() {
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  
  if (INTERNAL_CRON_SECRET && auth !== `Bearer ${INTERNAL_CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const result = await reconcileSubscriptions();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Reconciliation job failed:", error);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}