import { describe, expect, test } from "bun:test";

import { DEFAULT_ROLE, hasRole, normalizeRole, type UserRole } from "./session";

describe("normalizeRole", () => {
  test("returns valid roles unchanged", () => {
    const roles: UserRole[] = ["free", "user", "owner", "admin", "manager", "cashier"];
    for (const role of roles) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  test("falls back to default for unknown strings", () => {
    expect(normalizeRole("superadmin")).toBe(DEFAULT_ROLE);
    expect(normalizeRole("")).toBe(DEFAULT_ROLE);
  });

  test("falls back to default for non-string values", () => {
    expect(normalizeRole(null)).toBe(DEFAULT_ROLE);
    expect(normalizeRole(undefined)).toBe(DEFAULT_ROLE);
    expect(normalizeRole(42)).toBe(DEFAULT_ROLE);
    expect(normalizeRole({})).toBe(DEFAULT_ROLE);
  });
});

describe("hasRole", () => {
  test("returns false when role is undefined", () => {
    expect(hasRole(undefined, "user")).toBe(false);
  });

  test("owner satisfies every role", () => {
    const required: UserRole[] = ["free", "user", "cashier", "manager", "admin", "owner"];
    for (const role of required) {
      expect(hasRole("owner", role)).toBe(true);
    }
  });

  test("free and user share the lowest rank", () => {
    expect(hasRole("free", "user")).toBe(true);
    expect(hasRole("user", "free")).toBe(true);
    expect(hasRole("free", "cashier")).toBe(false);
  });

  test("respects role hierarchy", () => {
    expect(hasRole("cashier", "manager")).toBe(false);
    expect(hasRole("manager", "cashier")).toBe(true);
    expect(hasRole("admin", "manager")).toBe(true);
    expect(hasRole("manager", "admin")).toBe(false);
  });
});
