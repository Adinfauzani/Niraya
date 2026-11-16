import { NextResponse } from "next/server";

import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await getMaintenanceConfig();

    return NextResponse.json({
      enabled: config.enabled,
      message: config.message,
      startedAt: config.startedAt?.toISOString() ?? null,
      estimatedEndAt: resolveEstimatedEndAt(config)?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Maintenance status error:", error);
    return NextResponse.json({ error: "Gagal memuat status maintenance" }, { status: 500 });
  }
}