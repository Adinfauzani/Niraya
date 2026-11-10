import { describe, expect, test } from "bun:test";

import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";

function fakeDb(rows: any[] = [], shouldReject?: Error) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => (shouldReject ? Promise.reject(shouldReject) : Promise.resolve(rows)),
        }),
      }),
    }),
  } as any;
}

describe("getMaintenanceConfig", () => {
  test("returns disabled default when no row exists", async () => {
    const config = await getMaintenanceConfig(fakeDb([]));
    expect(config.enabled).toBe(false);
    expect(config.estimatedEndAt).toBeNull();
  });

  test("returns row when present", async () => {
    const row = {
      id: "default",
      enabled: true,
      message: "Back soon",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      estimatedEndAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const config = await getMaintenanceConfig(fakeDb([row]));
    expect(config.enabled).toBe(true);
    expect(config.message).toBe("Back soon");
    expect(config.startedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
  });

  test("returns disabled default when relation does not exist (42P01)", async () => {
    const err = new Error("relation does not exist") as Error & { code?: string };
    err.code = "42P01";
    const config = await getMaintenanceConfig(fakeDb([], err));
    expect(config.enabled).toBe(false);
  });

  test("rethrows non-42P01 errors", async () => {
    const err = new Error("connection refused") as Error & { code?: string };
    err.code = "57P01";
    await expect(getMaintenanceConfig(fakeDb([], err))).rejects.toThrow(
      "connection refused"
    );
  });

  test("null/undefined fields become null", async () => {
    const row = {
      id: "default",
      enabled: true,
      message: null,
      startedAt: null,
      estimatedEndAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const config = await getMaintenanceConfig(fakeDb([row]));
    expect(config.message).toBeNull();
    expect(config.startedAt).toBeNull();
    expect(config.estimatedEndAt).toBeNull();
  });
});

describe("resolveEstimatedEndAt", () => {
  test("uses explicit estimatedEndAt when set", () => {
    const explicit = new Date("2026-12-31T00:00:00Z");
    const config = {
      enabled: true,
      message: null,
      startedAt: new Date("2026-01-01T00:00:00Z"),
      estimatedEndAt: explicit,
    };
    expect(resolveEstimatedEndAt(config)).toBe(explicit);
  });

  test("derives from startedAt when enabled but no explicit end", () => {
    const started = new Date("2026-01-01T00:00:00Z");
    const config = {
      enabled: true,
      message: null,
      startedAt: started,
      estimatedEndAt: null,
    };
    const result = resolveEstimatedEndAt(config);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(started.getTime() + 48 * 60 * 60 * 1000);
  });

  test("returns null when disabled and no startedAt", () => {
    const config = {
      enabled: false,
      message: null,
      startedAt: null,
      estimatedEndAt: null,
    };
    expect(resolveEstimatedEndAt(config)).toBeNull();
  });

  test("returns null when enabled but startedAt is null", () => {
    const config = {
      enabled: true,
      message: null,
      startedAt: null,
      estimatedEndAt: null,
    };
    expect(resolveEstimatedEndAt(config)).toBeNull();
  });
});