import { describe, expect, test } from "bun:test";

import { enforceEntitlement } from "@/server/entitlements/check";

describe("enforceEntitlement", () => {
  test("does not throw when allowed", () => {
    const check = { allowed: true, currentCount: 1, limit: 5 };
    expect(() => enforceEntitlement(check)).not.toThrow();
  });

  test("throws with check message when not allowed", () => {
    const check = {
      allowed: false,
      currentCount: 5,
      limit: 5,
      message: "Batas pengguna tercapai (5).",
    };
    expect(() => enforceEntitlement(check)).toThrow(
      "Batas pengguna tercapai (5)."
    );
  });

  test("falls back to custom message when check has none", () => {
    const check = { allowed: false, currentCount: 0, limit: 0 };
    expect(() => enforceEntitlement(check, "custom fallback")).toThrow(
      "custom fallback"
    );
  });

  test("falls back to default message when neither provided", () => {
    const check = { allowed: false, currentCount: 0, limit: 0 };
    expect(() => enforceEntitlement(check)).toThrow(
      "Entitlement limit exceeded"
    );
  });
});