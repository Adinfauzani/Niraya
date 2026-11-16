import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { orders, transactions, orderStatusHistory } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = String(user.id);

  const [customerHist, handledOrders, handledTransactions] = await Promise.all([
    db.select({ orderId: orderStatusHistory.orderId }).from(orderStatusHistory)
      .where(and(eq(orderStatusHistory.changedByUserId, userId), eq(orderStatusHistory.changedByRole, "customer")))
      .orderBy(desc(orderStatusHistory.createdAt)).limit(50),
    db.select({
      id: orders.id, number: orders.orderNumber, status: orders.orderStatus, paymentStatus: orders.paymentStatus,
      total: orders.grandTotal, currency: orders.currency, source: orders.orderSource, createdAt: orders.createdAt, diningTableId: orders.diningTableId,
    }).from(orders).where(eq(orders.cashierId, userId)).orderBy(desc(orders.createdAt)).limit(20),
    db.select({
      id: transactions.id, number: transactions.transactionNumber, status: transactions.status, paymentStatus: transactions.paymentStatus,
      total: transactions.grandTotal, paymentMethod: transactions.paymentMethod, createdAt: transactions.createdAt,
    }).from(transactions).where(eq(transactions.cashierId, userId)).orderBy(desc(transactions.createdAt)).limit(20),
  ]);

  const customerOrderIds = [...new Set(customerHist.map((h) => h.orderId).filter(Boolean))] as string[];
  const storefrontOrders = customerOrderIds.length ? await db.select({
    id: orders.id, number: orders.orderNumber, status: orders.orderStatus, paymentStatus: orders.paymentStatus,
    total: orders.grandTotal, currency: orders.currency, source: orders.orderSource, createdAt: orders.createdAt, diningTableId: orders.diningTableId,
  }).from(orders).where(inArray(orders.id, customerOrderIds)).orderBy(desc(orders.createdAt)).limit(20) : [];

  const normalizeSource = (source: string | null, diningTableId?: unknown) => {
    const s = String(source || "");
    if (s === "QR_GENERAL" && !diningTableId) return "STOREFRONT";
    if (s === "QR_GENERAL") return "QR_GENERAL";
    if (s === "QR_TABLE") return "QR_TABLE";
    if (s === "POS") return "POS";
    return s || "ORDER";
  };

  const activity = [
    ...storefrontOrders.map((o) => ({
      kind: "order" as const, role: "customer" as const, id: o.id, number: o.number, status: o.status, paymentStatus: o.paymentStatus,
      total: Number(o.total || 0), currency: o.currency || "IDR", source: normalizeSource(o.source, o.diningTableId), createdAt: o.createdAt,
    })),
    ...handledOrders.map((o) => ({
      kind: "order" as const, role: "staff" as const, id: o.id, number: o.number, status: o.status, paymentStatus: o.paymentStatus,
      total: Number(o.total || 0), currency: o.currency || "IDR", source: normalizeSource(o.source, o.diningTableId), createdAt: o.createdAt,
    })),
    ...handledTransactions.map((t) => ({
      kind: "transaction" as const, role: "staff" as const, id: t.id, number: t.number, status: t.status, paymentStatus: t.paymentStatus,
      total: Number(t.total || 0), currency: "IDR", source: "POS", paymentMethod: t.paymentMethod, createdAt: t.createdAt,
    })),
  ]
    .filter((item, i, arr) => arr.findIndex((x) => x.kind === item.kind && x.id === item.id && x.role === item.role) === i)
    .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    .slice(0, 25);

  return NextResponse.json({ activity });
}
