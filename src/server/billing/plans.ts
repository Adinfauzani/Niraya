import { eq } from "drizzle-orm";

import { env } from "@/lib/env";
import {
  PLAN_DEFINITIONS,
  type PlanDefinition,
} from "@/lib/plans";
import { db } from "@/server/db";
import { plans, type PlanEntitlements } from "@/server/db/schema";

export type {
  BillingRecurrence,
  BillingTier,
  PlanDefinition,
} from "@/lib/plans";

export type ResolvedPlan = {
  id: string;
  code: string;
  name: string;
  tier: string;
  recurrence: string;
  intervalMonths: number;
  gumroadProductId: string | null;
  priceCents: number;
  currency: string;
  entitlements: PlanEntitlements;
};

const PRODUCT_ID_OVERRIDES: Record<string, string | undefined> = {
  "starter-monthly": env.GUMROAD_PRODUCT_STARTER || undefined,
  "plus-biannually": env.GUMROAD_PRODUCT_PLUS || undefined,
  "pro-yearly": env.GUMROAD_PRODUCT_PRO || undefined,
};

/**
 * Server-side catalog. The customer-facing definitions live in
 * `src/lib/plans.ts`; environment variables can override product IDs without
 * duplicating the rest of the plan data.
 */
export const PLAN_CATALOG: PlanDefinition[] = PLAN_DEFINITIONS.map((plan) => ({
  ...plan,
  gumroadProductId:
    PRODUCT_ID_OVERRIDES[plan.id] ?? plan.gumroadProductId,
}));

export function toResolvedPlan(row: typeof plans.$inferSelect): ResolvedPlan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    tier: row.tier,
    recurrence: row.recurrence,
    intervalMonths: row.intervalMonths,
    gumroadProductId: row.gumroadProductId,
    priceCents: row.priceCents,
    currency: row.currency,
    entitlements: row.entitlements ?? {},
  };
}

/** Buat/update baris `platform.Plans` dari definisi kode. */
export async function ensurePlanRow(plan: PlanDefinition) {
  const now = new Date();
  const values = {
    code: plan.code,
    name: plan.name,
    tier: plan.tier,
    recurrence: plan.recurrence,
    intervalMonths: plan.intervalMonths,
    gumroadProductId: plan.gumroadProductId ?? null,
    priceCents: plan.priceCents,
    currency: plan.currency,
    entitlements: plan.entitlements,
    isActive: true,
    updatedAt: now,
  };

  // Jika product ID sudah dipakai baris lain (mis. hasil edit manual),
  // update baris itu agar tidak melanggar unique constraint.
  if (plan.gumroadProductId) {
    const [byProduct] = await db
      .select()
      .from(plans)
      .where(eq(plans.gumroadProductId, plan.gumroadProductId))
      .limit(1);

    if (byProduct && byProduct.id !== plan.id) {
      const [updated] = await db
        .update(plans)
        .set(values)
        .where(eq(plans.id, byProduct.id))
        .returning();
      return updated;
    }
  }

  const [row] = await db
    .insert(plans)
    .values({
      id: plan.id,
      ...values,
    })
    .onConflictDoUpdate({
      target: plans.id,
      set: values,
    })
    .returning();

  return row;
}

/**
 * Cari paket berdasarkan `product_id` Gumroad.
 *
 * Urutan: baris DB (bisa diubah manual) -> katalog kode -> simpan ke DB.
 */
export async function resolvePlanForProduct(
  productId: string | null | undefined
): Promise<ResolvedPlan | null> {
  if (!productId) return null;

  const [existing] = await db
    .select()
    .from(plans)
    .where(eq(plans.gumroadProductId, productId))
    .limit(1);

  if (existing) return toResolvedPlan(existing);

  const definition = PLAN_CATALOG.find(
    (plan) => plan.gumroadProductId === productId
  );
  if (!definition) return null;

  const row = await ensurePlanRow(definition);
  return row ? toResolvedPlan(row) : null;
}

/** Seed idempotent untuk `bun db:seed:platform`. */
export async function seedPlans() {
  for (const plan of PLAN_CATALOG) {
    await ensurePlanRow(plan);
  }
  return PLAN_CATALOG.length;
}
