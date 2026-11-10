import { NextResponse } from "next/server";
import { expireReservations } from "@/server/storefront/payments";
import { getClientIp, rateLimitAsync, rateLimitResponse, stableRateKey } from "@/server/security/RateLimit";

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = getClientIp(request); const rl = await rateLimitAsync(`internal:expire:${stableRateKey([ip])}`, { limit: 10, windowMs: 60_000 }); if (!rl.ok) return rateLimitResponse(rl.resetAt, rl.degraded);
  const result = await expireReservations();
  return NextResponse.json({ ok: true, ...result });
}
