import { describe, expect, test } from "bun:test";

import { resolveWorkspaceRole } from "@/server/auth/initialization";

describe("resolveWorkspaceRole", () => {
  test("promotes default user role to owner", () => {
    expect(resolveWorkspaceRole("user")).toBe("owner");
  });

  test("keeps owner role as owner", () => {
    expect(resolveWorkspaceRole("owner")).toBe("owner");
  });

  test("promotes null/undefined to owner", () => {
    expect(resolveWorkspaceRole(null)).toBe("owner");
    expect(resolveWorkspaceRole(undefined)).toBe("owner");
  });

  test("promotes any other role to owner", () => {
    expect(resolveWorkspaceRole("admin")).toBe("owner");
    expect(resolveWorkspaceRole("manager")).toBe("owner");
    expect(resolveWorkspaceRole("cashier")).toBe("owner");
  });
});