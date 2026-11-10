import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { maintenanceConfig } from "@/server/db/schema/platform";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ensureUserProfile, requireRole, ACTION_ROLES } from "@/server/auth/session";

const DEFAULT_ESTIMATED_HOURS = 48;

const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(2000).optional(),
});

async function requireAdminAccess() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any };
  await ensureUserProfile(user);
  try {
    await requireRole(ACTION_ROLES["settings.update"] || "admin");
  } catch (e: any) {
    return { error: NextResponse.json({ error: e?.message || "Akses ditolak." }, { status: e?.status || 403 }) };
  }
  return { user };
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAccess();
  if ((auth as any).error) return (auth as any).error;

  const body = await request.json().catch(() => null);
  const parsed = maintenanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Data tidak valid." }, { status: 400 });
  }

  const { enabled, message } = parsed.data;
  const now = new Date();

  try {
    let startedAt: Date | null = null;
    let estimatedEndAt: Date | null = null;

    if (enabled) {
      // Get existing config to check if already enabled
      const [existing] = await db
        .select()
        .from(maintenanceConfig)
        .where(eq(maintenanceConfig.id, "default"))
        .limit(1);

      if (existing?.enabled) {
        // Already enabled, keep existing startedAt
        startedAt = existing.startedAt ?? now;
        estimatedEndAt = existing.estimatedEndAt ?? new Date(startedAt.getTime() + DEFAULT_ESTIMATED_HOURS * 60 * 60 * 1000);
      } else {
        // First time enabling
        startedAt = now;
        estimatedEndAt = new Date(now.getTime() + DEFAULT_ESTIMATED_HOURS * 60 * 60 * 1000);
      }
    } else {
      // Disabling maintenance - clear timestamps
      startedAt = null;
      estimatedEndAt = null;
    }

    await db
      .insert(maintenanceConfig)
      .values({
        id: "default",
        enabled,
        message: message ?? null,
        startedAt,
        estimatedEndAt,
        updatedAt: now,
      } as any)
      .onConflictDoUpdate({
        target: maintenanceConfig.id,
        set: {
          enabled,
          message: message ?? null,
          startedAt,
          estimatedEndAt,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Maintenance config update error:", error);
    return NextResponse.json({ error: "Gagal memperbarui konfigurasi maintenance" }, { status: 500 });
  }
}