import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { orders, payments } from "@/server/db/schema";
import {
  requireBusinessContext,
  requireSession,
} from "@/server/auth/routeContext";
import { readPaymentProof } from "@/server/storage/PaymentProof";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId wajib diisi." },
      { status: 400 }
    );
  }

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.businessId, context.businessId),
        eq(orders.storeId, context.storeId)
      )
    )
    .limit(1);

  if (!order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan." },
      { status: 404 }
    );
  }

  const [payment] = await db
    .select({ id: payments.id, proofUrl: payments.proofUrl })
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.orderId, id)))
    .limit(1);

  if (!payment || !payment.proofUrl) {
    return NextResponse.json(
      { error: "Bukti transfer tidak ditemukan." },
      { status: 404 }
    );
  }

  try {
    const file = await readPaymentProof(payment.proofUrl);
    if (!file) {
      return NextResponse.json(
        { error: "Bukti transfer tidak ditemukan." },
        { status: 404 }
      );
    }
    const body = new Uint8Array(file.bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    const message =
      status >= 500
        ? e?.message || "Gagal memuat bukti transfer."
        : e?.message || "Gagal memuat bukti transfer.";
    if (status >= 500) {
      console.error("Payment proof read error:", e?.message ?? e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
