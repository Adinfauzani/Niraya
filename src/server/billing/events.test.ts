import { describe, expect, test } from "bun:test";

import {
  buildEventKey,
  parseGumroadPayload,
} from "@/server/billing/events";
import {
  isSubscriptionUsable,
  normalizeEmail,
} from "@/server/billing/subscriptions";

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });

  test("handles empty string", () => {
    expect(normalizeEmail("")).toBe("");
  });
});

describe("isSubscriptionUsable", () => {
  const base = {
    status: "active",
    currentPeriodEnd: null,
    endedAt: null,
  };

  test("active with no period end is usable", () => {
    expect(isSubscriptionUsable(base)).toBe(true);
  });

  test("cancel_at_period_end is usable while still in grace", () => {
    const inGrace = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      isSubscriptionUsable({
        status: "cancel_at_period_end",
        currentPeriodEnd: inGrace,
        endedAt: null,
      })
    ).toBe(true);
  });

  test("cancel_at_period_end past grace is not usable", () => {
    const expired = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(
      isSubscriptionUsable({
        status: "cancel_at_period_end",
        currentPeriodEnd: expired,
        endedAt: null,
      })
    ).toBe(false);
  });

  test("ended status is never usable", () => {
    expect(
      isSubscriptionUsable({
        status: "ended",
        currentPeriodEnd: null,
        endedAt: new Date(),
      })
    ).toBe(false);
  });

  test("past_due status is not usable", () => {
    expect(
      isSubscriptionUsable({
        status: "past_due",
        currentPeriodEnd: null,
        endedAt: null,
      })
    ).toBe(false);
  });
});

describe("parseGumroadPayload", () => {
  test("parses JSON content type", () => {
    const payload = parseGumroadPayload(
      JSON.stringify({ sale_id: "abc", user_email: "x@y.com" }),
      "application/json"
    );
    expect(payload.sale_id).toBe("abc");
    expect(payload.user_email).toBe("x@y.com");
  });

  test("parses URL-encoded form body", () => {
    const payload = parseGumroadPayload(
      "sale_id=abc&user_email=x%40y.com",
      "application/x-www-form-urlencoded"
    );
    expect(payload.sale_id).toBe("abc");
    expect(payload.user_email).toBe("x@y.com");
  });

  test("falls back to throwing for invalid JSON", () => {
    expect(() => parseGumroadPayload("not json", "application/json")).toThrow();
  });
});

describe("buildEventKey", () => {
  test("sale key uses sale id", () => {
    expect(buildEventKey("sale", { sale_id: "s1" })).toBe("sale:s1");
  });

  test("cancellation key includes subscription + date", () => {
    expect(
      buildEventKey("cancellation", {
        subscription_id: "sub1",
        cancelled_at: "2026-01-01",
      })
    ).toBe("cancellation:sub1:2026-01-01");
  });

  test("unknown resource falls back to hash", () => {
    const key = buildEventKey("weird_event", { foo: "bar" });
    expect(key).toMatch(/^weird_event:[a-f0-9]{32}$/);
  });

  test("same payload produces same key", () => {
    const payload = { subscription_id: "sub1", updated_at: "2026-01-01" };
    expect(buildEventKey("subscription_updated", payload)).toBe(
      buildEventKey("subscription_updated", payload)
    );
  });

  test("different payload produces different key", () => {
    expect(
      buildEventKey("subscription_updated", {
        subscription_id: "sub1",
        updated_at: "2026-01-01",
      })
    ).not.toBe(
      buildEventKey("subscription_updated", {
        subscription_id: "sub2",
        updated_at: "2026-01-01",
      })
    );
  });
});