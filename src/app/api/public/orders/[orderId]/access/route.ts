import { NextResponse } from "next/server";
import { getClientIp, rateLimitAsync, rateLimitResponse, stableRateKey } from "@/server/security/rate-limit";
import { assertSameOriginIfCookieAuth } from "@/server/storefront/request-security";
import { getGuestTokenFromRequest, guestCookieHeader, rotateGuestAccess } from "@/server/storefront/guest-access";

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`public:access-rotate:${stableRateKey([ip])}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt, rl.degraded);
  const same = assertSameOriginIfCookieAuth(request); if (!same.ok) return NextResponse.json({ error: same.error }, { status: same.status });
  const { orderId } = await ctx.params;
  const token = getGuestTokenFromRequest(request, orderId);
  if (!token) return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  try {
    const next = await rotateGuestAccess(orderId, token);
    const res = NextResponse.json({ ok: true, guestAccessExpiresAt: next.expiresAt.toISOString() });
    res.headers.set("set-cookie", guestCookieHeader(orderId, next.rawToken, next.expiresAt));
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Akses tidak valid." }, { status: e?.status ?? 403 });
  }
}
