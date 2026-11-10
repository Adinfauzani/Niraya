import { NextResponse } from "next/server";
import { getPublicStorefrontCatalog } from "@/server/storefront/catalog";
import { getClientIp, rateLimitAsync, rateLimitResponse } from "@/server/security/RateLimit";

export async function GET(request: Request) {
  const ip = getClientIp(request); const rl = await rateLimitAsync(`storefront:catalog:${ip}`, { limit: 90, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);
  try {
    const catalog = await getPublicStorefrontCatalog();
    return NextResponse.json({ ok: true, catalog, context: { mode: "direct" as const } });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Gagal memuat katalog." }, { status: e?.status ?? 500 }); }
}
