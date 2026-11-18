import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderStatusHistory } from "@/server/db/schema";
import { getSession } from "@/lib/auth";
import { getGuestTokenFromRequest, resolveGuestAccess } from "@/server/storefront/GuestAccess";
import { getClientIp, rateLimitAsync, rateLimitResponse } from "@/server/security/RateLimit";
import { assertSameOriginIfCookieAuth } from "@/server/storefront/RequestSecurity";
import { submitPaymentProof } from "@/server/storefront/payments";
import { storePaymentProof } from "@/server/storage/PaymentProof";

export const runtime = "nodejs";

const Meta = z.object({ orderId: z.string().min(1), paymentId: z.string().uuid(), referenceNumber: z.string().max(100).optional() });
export async function POST(request: Request) {
  const ip = getClientIp(request); const rl = await rateLimitAsync(`public:proof:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);
  const same = assertSameOriginIfCookieAuth(request);
  if (!same.ok) return NextResponse.json({ error: same.error }, { status: same.status });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form data tidak valid." }, { status: 400 });
  const parsed = Meta.safeParse({
    orderId: form.get("orderId"),
    paymentId: form.get("paymentId"),
    referenceNumber: form.get("referenceNumber") || undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Data bukti tidak valid." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0)
    return NextResponse.json({ error: "File bukti wajib diunggah." }, { status: 400 });
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, parsed.data.orderId))
    .limit(1);
  if (!order)
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 403 });

  // Izinkan pemilik terautentikasi (customerId/riwayat pesanan) atau akses guest (token/cookie),
  // selaras dengan GET /api/public/orders/[orderId].
  let authorized = false;
  const session = await getSession().catch(() => null);
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (user?.id && order.customerId && String(order.customerId) === String(user.id))
    authorized = true;
  if (!authorized && user?.id) {
    const [hist] = await db
      .select({ id: orderStatusHistory.id })
      .from(orderStatusHistory)
      .where(
        and(
          eq(orderStatusHistory.orderId, parsed.data.orderId),
          eq(orderStatusHistory.changedByUserId, String(user.id)),
          eq(orderStatusHistory.changedByRole, "customer"),
        ),
      )
      .orderBy(desc(orderStatusHistory.createdAt))
      .limit(1);
    if (hist) authorized = true;
  }
  if (!authorized) {
    const token = getGuestTokenFromRequest(request, parsed.data.orderId);
    const access = await resolveGuestAccess(parsed.data.orderId, token);
    if (access) authorized = true;
  }
  if (!authorized)
    return NextResponse.json(
      { error: "Akses pesanan tidak valid. Muat ulang halaman pembayaran." },
      { status: 403 },
    );
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storePaymentProof({ paymentId: parsed.data.paymentId, contentType: file.type, bytes });
    await submitPaymentProof({ orderId: parsed.data.orderId, paymentId: parsed.data.paymentId, proofUrl: stored.key, referenceNumber: parsed.data.referenceNumber });
    return NextResponse.json({ ok: true, paymentStatus: "AWAITING_VERIFICATION", submittedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload gagal." }, { status: e?.status ?? 400 });
  }
}
