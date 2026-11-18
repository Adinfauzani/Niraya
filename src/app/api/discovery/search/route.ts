import { NextRequest, NextResponse } from "next/server";

import { searchDiscovery } from "@/server/discovery/home";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const category = sp.get("category") || undefined;
  const nearLat = sp.get("lat") ? Number(sp.get("lat")) : null;
  const nearLng = sp.get("lng") ? Number(sp.get("lng")) : null;
  const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;

  const result = await searchDiscovery({
    q,
    category,
    nearLat: Number.isFinite(nearLat as number) ? nearLat : null,
    nearLng: Number.isFinite(nearLng as number) ? nearLng : null,
    limit,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
