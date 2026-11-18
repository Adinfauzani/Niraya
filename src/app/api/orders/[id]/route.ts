import { NextResponse } from "next/server";

import {
  requireBusinessContext,
  requireSession,
} from "@/server/auth/routeContext";
import { getOrderDetail } from "@/server/services/OrderService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let context: { businessId: string | null; storeId: string | null };
  try {
    context = await requireBusinessContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!context.businessId || !context.storeId) {
    return NextResponse.json(
      { error: "Belum ada toko aktif untuk akun ini." },
      { status: 400 }
    );
  }

  const { id } = await params;
  try {
    const detail = await getOrderDetail({
      businessId: context.businessId,
      storeId: context.storeId,
      orderId: id,
    });
    if (!detail) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ order: detail });
  } catch (error) {
    console.error("Order detail error:", (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: "Gagal memuat detail pesanan." },
      { status: 500 }
    );
  }
}
