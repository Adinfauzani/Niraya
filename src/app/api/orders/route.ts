import { NextResponse } from "next/server";

import {
  requireBusinessContext,
  requireSession,
} from "@/server/auth/routeContext";
import {
  getOrderCounts,
  listOrders,
} from "@/server/services/OrderService";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

function resolveError(error: unknown): { status: number; message: string } {
  const err = error as { message?: string; status?: number };
  const message = err?.message ?? "Gagal memuat pesanan.";
  if (
    message === "Unauthorized" ||
    message === "No active business membership found"
  ) {
    return { status: 401, message };
  }
  return { status: 500, message: "Gagal memuat pesanan." };
}

export async function GET(request: Request) {
  const user = await requireSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let context: { businessId: string | null; storeId: string | null };
  try {
    context = await requireBusinessContext();
  } catch (error) {
    const { status, message } = resolveError(error);
    return NextResponse.json({ error: message }, { status });
  }

  if (!context.businessId || !context.storeId) {
    return NextResponse.json(
      { error: "Belum ada toko aktif untuk akun ini." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const summaryOnly = searchParams.get("summary") === "1";
  const limit = Number(searchParams.get("limit") ?? 100);

  try {
    const counts = await getOrderCounts({
      businessId: context.businessId,
      storeId: context.storeId,
    });

    if (summaryOnly) {
      return NextResponse.json({ counts });
    }

    const orders = await listOrders({
      businessId: context.businessId,
      storeId: context.storeId,
      status,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return NextResponse.json({ orders, counts });
  } catch (error) {
    const { status: errorStatus, message } = resolveError(error);
    if (errorStatus >= 500) {
      console.error("Orders load error:", (error as Error)?.message ?? error);
    }
    return NextResponse.json({ error: message }, { status: errorStatus });
  }
}