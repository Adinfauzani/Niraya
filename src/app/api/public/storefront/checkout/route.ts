import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { assertSameOriginIfCookieAuth } from "@/server/storefront/RequestSecurity";
import { getClientIp, rateLimitAsync, rateLimitResponse } from "@/server/security/RateLimit";
import { executeStorefrontCheckout } from "@/server/storefront/checkout";
import { guestCookieHeader } from "@/server/storefront/GuestAccess";
import { getMaintenanceConfig } from "@/server/maintenance";

async function checkMaintenanceMode(): Promise<{ enabled: boolean; estimatedEndAt: Date | null }> {
  const config = await getMaintenanceConfig();
  if (!config.enabled) {
    return { enabled: false, estimatedEndAt: null };
  }
  return { enabled: true, estimatedEndAt: config.estimatedEndAt };
}

const schema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  storeId: z.string().uuid().optional(),
  paymentMethod: z.literal("manual_transfer"),
  orderType: z.enum(["dine-in","takeaway"]).optional(),
  notes: z.string().max(500).optional(),
  guest: z.object({ name: z.string().min(1).max(120), phone: z.string().min(6).max(30), email: z.string().email().max(160).optional().or(z.literal("")) }).optional(),
  items: z.array(z.object({ productId: z.string().min(1), variantId: z.string().optional().nullable(), quantity: z.number().int().positive().max(99), notes: z.string().max(200).optional() })).min(1).max(100),
});

async function safeJson(request: Request) {
  try { return await request.json(); } catch { return null; }
}

export async function POST(request: Request) {
  const maintenance = await checkMaintenanceMode();
  if (maintenance.enabled) {
    return NextResponse.json(
      {
        error: "Sistem sedang dalam mode maintenance. Checkout tidak tersedia.",
        code: "MAINTENANCE_MODE",
        estimatedEndAt: maintenance.estimatedEndAt?.toISOString() ?? null,
      },
      { status: 503 }
    );
  }

  const origin = assertSameOriginIfCookieAuth(request);
  if (!origin.ok) return NextResponse.json({ error: origin.error }, { status: origin.status });
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`public:storefront-checkout:${ip}`, { limit: 8, windowMs: 60_000, failClosedOnDegraded: true } as any);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);
  const body = await safeJson(request); const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Payload tidak valid." }, { status: 400 });
  let user: any = null;
  try { const session = await getSession(); user = (session as any)?.user ?? (session as any)?.data?.user ?? null; } catch {}
  if (!user?.id && !parsed.data.guest) return NextResponse.json({ error: "Data pemesan tamu diperlukan." }, { status: 400 });
  try {
    const customer = user?.id
      ? { mode: "authenticated" as const, name: String(user.name || "Customer"), phone: String((user as any).phone || parsed.data.guest?.phone || ""), email: (user.email ?? null) as string|null, authUserId: String(user.id) }
      : { mode: "guest" as const, name: parsed.data.guest!.name, phone: parsed.data.guest!.phone, email: parsed.data.guest!.email || null };
    const result = await executeStorefrontCheckout({ idempotencyKey: parsed.data.idempotencyKey, storeId: parsed.data.storeId, items: parsed.data.items, paymentMethod: "manual_transfer", orderType: parsed.data.orderType, notes: parsed.data.notes, customer });
    const raw = (result as any)._guestAccessRaw as string | undefined; delete (result as any)._guestAccessRaw;
    const res = NextResponse.json(result);
    if (raw && result.orderId && (result as any).guestAccess?.expiresAt) {
      res.headers.set("set-cookie", guestCookieHeader(result.orderId, raw, new Date((result as any).guestAccess.expiresAt)));
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout gagal." }, { status: e?.status || 500 });
  }
}
