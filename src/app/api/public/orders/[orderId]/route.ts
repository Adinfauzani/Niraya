import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, payments, businessSettings, paymentSettings, orderStatusHistory } from "@/server/db/schema";
import { getSession } from "@/lib/auth";
import { getGuestTokenFromRequest, resolveGuestAccess } from "@/server/storefront/GuestAccess";
import { getClientIp, rateLimitAsync, rateLimitResponse } from "@/server/security/RateLimit";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const ip = getClientIp(request); const rl = await rateLimitAsync(`public:order:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);
  const { orderId } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  const session = await getSession().catch(()=>null); const user = (session as any)?.user ?? (session as any)?.data?.user;
  let authorized = false;
  if (user?.id && order.customerId && String(order.customerId) === String(user.id)) authorized = true;
  if (!authorized && user?.id) {
    const [hist] = await db.select({ id: orderStatusHistory.id }).from(orderStatusHistory)
      .where(and(eq(orderStatusHistory.orderId, orderId), eq(orderStatusHistory.changedByUserId, String(user.id)), eq(orderStatusHistory.changedByRole, "customer")))
      .orderBy(desc(orderStatusHistory.createdAt)).limit(1);
    if (hist) authorized = true;
  }
  if (!authorized && !order.customerId) {
    const token = getGuestTokenFromRequest(request, orderId);
    const access = await resolveGuestAccess(orderId, token);
    if (access) authorized = true;
  }
  if (!authorized) return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  const items = await db.select({ productName: orderItems.productName, variantName: orderItems.variantName, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, subtotal: orderItems.subtotal, notes: orderItems.notes }).from(orderItems).where(eq(orderItems.orderId, orderId));
  const [pay] = await db.select({ id: payments.id, status: payments.status, method: payments.paymentMethod, amount: payments.amount, proofSubmittedAt: payments.proofSubmittedAt, referenceNumber: payments.referenceNumber, expiresAt: payments.expiresAt }).from(payments).where(eq(payments.orderId, orderId)).limit(1);
  const [ps] = await db.select().from(paymentSettings).where(eq(paymentSettings.businessId, order.businessId)).limit(1);
  const [legacy] = await db.select().from(businessSettings).where(eq(businessSettings.id, "default")).limit(1);
  const src = String(order.orderSource);
  const isQrTable = src === "QR_TABLE";
  const publicSource = (src === "QR_GENERAL" && !order.diningTableId) ? "STOREFRONT" : src;
  const instr = String(pay?.method)==="manual_transfer" ? {
    bankName: (ps as any)?.manualTransferBankName ?? (legacy as any)?.manualTransferBankName ?? null,
    accountName: (ps as any)?.manualTransferAccountName ?? (legacy as any)?.manualTransferAccountName ?? null,
    accountNumber: (ps as any)?.manualTransferAccountNumber ?? (legacy as any)?.manualTransferAccountNumber ?? null,
    instructions: (ps as any)?.manualTransferInstructions ?? (legacy as any)?.manualTransferInstructions ?? null,
    qrisImageUrl: (ps as any)?.manualTransferQrisImageUrl ?? (legacy as any)?.manualTransferQrisImageUrl ?? null,
  } : null;
  return NextResponse.json({ order: {
    id: order.id, orderNumber: order.orderNumber, orderSource: publicSource, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus,
    customerName: order.customerName, tableNumber: isQrTable ? order.tableNumber : null, orderType: (order as any).orderType ?? null, totals: { subtotal: Number(order.subtotal), tax: Number(order.taxTotal), total: Number(order.grandTotal), currency: order.currency },
    items: items.map(i=>({...i, unitPrice:Number(i.unitPrice), subtotal:Number(i.subtotal)})),     payment: pay ? { id: pay.id, status: pay.status, method: pay.method, amount: Number(pay.amount), proofSubmitted: !!pay.proofSubmittedAt, referenceNumber: pay.referenceNumber || null, expiresAt: pay.expiresAt?.toISOString() ?? null, instructions: instr } : null,
    createdAt: order.createdAt, submittedAt: order.submittedAt, paidAt: order.paidAt,
  }});
}
