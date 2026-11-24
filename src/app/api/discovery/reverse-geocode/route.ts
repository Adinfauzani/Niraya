import { NextRequest, NextResponse } from "next/server";

import { reverseGeocode } from "@/server/discovery/geocode";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ label: null }, { status: 400 });
  }

  const label = await reverseGeocode(lat, lng);
  return NextResponse.json({ label }, { headers: { "Cache-Control": "public, max-age=3600" } });
}