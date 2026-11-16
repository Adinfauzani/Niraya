import { describe, expect, test } from "bun:test";

import {
  findPlanDefinition,
  PLAN_CATALOG,
  toResolvedPlan,
} from "@/server/billing/plans";
import { plans } from "@/server/db/schema";

describe("PLAN_CATALOG", () => {
  test("has all four tiers", () => {
    const codes = PLAN_CATALOG.map((p) => p.code).sort();
    expect(codes).toEqual([
      "free",
      "plus-biannually",
      "pro-yearly",
      "starter-monthly",
    ]);
  });

  test("free plan has zero price", () => {
    const free = PLAN_CATALOG.find((p) => p.code === "free");
    expect(free).toBeDefined();
    expect(free!.priceCents).toBe(0);
    expect(free!.intervalMonths).toBe(1);
  });

  test("every plan has an entitlements object", () => {
    for (const plan of PLAN_CATALOG) {
      expect(plan.entitlements).toBeDefined();
      expect(typeof plan.entitlements.maxUsers).toBe("number");
    }
  });

  test("every paid plan has a gumroadProductId", () => {
    for (const plan of PLAN_CATALOG) {
      if (plan.tier === "free") continue;
      expect(plan.gumroadProductId, `${plan.code} missing gumroadProductId`).toBeTruthy();
    }
  });

  test("no duplicate gumroad product ids", () => {
    const ids = PLAN_CATALOG.map((p) => p.gumroadProductId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("findPlanDefinition", () => {
  const paidPlans = PLAN_CATALOG.filter((plan) => plan.tier !== "free");

  test("matches by gumroadProductId", () => {
    for (const plan of paidPlans) {
      expect(findPlanDefinition([plan.gumroadProductId])?.code).toBe(plan.code);
    }
  });

  test("matches by gumroadPermalink", () => {
    for (const plan of paidPlans) {
      expect(findPlanDefinition([plan.gumroadPermalink])?.code).toBe(plan.code);
    }
  });

  test("matches when product_id misses but permalink hits", () => {
    const plan = PLAN_CATALOG.find((p) => p.tier === "starter")!;
    const result = findPlanDefinition([
      "product-id-yang-tidak-dikenal",
      plan.gumroadPermalink,
    ]);
    expect(result?.code).toBe(plan.code);
  });

  test("returns null for the free plan or empty candidates", () => {
    expect(findPlanDefinition([""])).toBeNull();
    expect(findPlanDefinition(["unknown", "   ", null, undefined])).toBeNull();
    expect(findPlanDefinition([])).toBeNull();
  });
});

describe("toResolvedPlan", () => {
  test("maps a DB row to a ResolvedPlan", () => {
    const row = {
      id: "p1",
      code: "starter",
      name: "Starter",
      tier: "starter",
      recurrence: "monthly",
      intervalMonths: 1,
      gumroadProductId: "gum_starter",
      priceCents: 49000,
      currency: "IDR",
      entitlements: { maxUsers: 5, maxStores: 1, maxProducts: 100 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as typeof plans.$inferSelect;

    const resolved = toResolvedPlan(row);

    expect(resolved.id).toBe("p1");
    expect(resolved.code).toBe("starter");
    expect(resolved.priceCents).toBe(49000);
    expect(resolved.entitlements.maxUsers).toBe(5);
  });

  test("falls back to empty entitlements when null", () => {
    const row = {
      id: "p2",
      code: "free",
      name: "Free",
      tier: "free",
      recurrence: "monthly",
      intervalMonths: 1,
      gumroadProductId: null,
      priceCents: 0,
      currency: "IDR",
      entitlements: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as typeof plans.$inferSelect;

    const resolved = toResolvedPlan(row);
    expect(resolved.entitlements).toEqual({});
    expect(resolved.gumroadProductId).toBeNull();
  });
});