import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders } from "@/server/db/schema";
import { getGuestTokenFromRequest, resolveGuestAccess } from "@/server/storefront/guest-access";
import { getClientIp, rateLimitAsync, rateLimitResponse } from "@/server/security/rate-limit";
import { assertSameOriginIfCookieAuth } from "@/server/storefront/request-security";
import { submitPaymentProof } from "@/server/storefront/payments";
import { storePaymentProof } from "@/server/storage/payment-proof";

const Meta = z.object({ orderId: z.string().min(1), paymentId: z.string().uuid(), referenceNumber: z.string().max(100).optional() });
export async function POST(request: Request) {
  const ip = getClientIp(request); const rl = await rateLimitAsync(`public:proof:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);
  const same = assertSameOriginIfCookieAuth(request); if (!same.ok) return NextResponse.json({ error: same.error }, { status: same.status });
  const form = await request.formData().catch(()=>null);
  if (!form) return NextResponse.json({ error: "Form data tidak valid." }, { status: 400 });
  const parsed = Meta.safeParse({ orderId: form.get("orderId"), paymentId: form.get("paymentId"), referenceNumber: form.get("referenceNumber") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "Data bukti tidak valid." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "File bukti wajib diunggah." }, { status: 400 });
  const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1);
  if (!order) return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  const token = getGuestTokenFromRequest(request, parsed.data.orderId);
  const access = await resolveGuestAccess(parsed.data.orderId, token);
  if (!access) return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storePaymentProof({ paymentId: parsed.data.paymentId, contentType: file.type, bytes });
    await submitPaymentProof({ orderId: parsed.data.orderId, paymentId: parsed.data.paymentId, proofUrl: stored.key, referenceNumber: parsed.data.referenceNumber, proofChecksum: stored.sha256 });
    return NextResponse.json({ ok: true, paymentStatus: "AWAITING_VERIFICATION", submittedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload gagal." }, { status: e?.status ?? 400 });
  }
}
