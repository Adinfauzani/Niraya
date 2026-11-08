import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  DEFAULT_BUSINESS_ID,
  DEFAULT_STORE_ID,
  inventory,
  inventoryReservations,
  orders,
  orderItems,
  orderStatusHistory,
  payments,
  products,
  stockMovements,
  transactionItems,
  transactions,
} from "@/server/db/schema";

/** Payment proof/verification primitives for storefront/legacy orders. */

export async function submitPaymentProof(input: { orderId: string; paymentId: string; proofUrl: string; referenceNumber?: string; proofChecksum?: string | null }) {
  const now = new Date();
  const [row] = await db.update(payments).set({
    proofUrl: input.proofUrl,
    referenceNumber: input.referenceNumber ?? null,
    proofSubmittedAt: now,
    status: "AWAITING_VERIFICATION",
    proofChecksum: input.proofChecksum ?? null,
  } as any).where(and(eq(payments.id, input.paymentId), eq(payments.orderId, input.orderId))).returning();
  return row;
}

export async function verifyManualPayment(input: { paymentId: string; action: "APPROVE" | "REJECT"; actorUserId: string; reason?: string }) {
  const now = new Date();
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment-verify:${input.paymentId}`}))`);
    const [pay] = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1).for("update");
    if (!pay) throw Object.assign(new Error("Pembayaran tidak ditemukan."), { status: 404 });
    const [order] = await tx.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1).for("update");
    if (!order) throw Object.assign(new Error("Order tidak ditemukan."), { status: 404 });
    const status = String(pay.status).toUpperCase();
    if (input.action === "REJECT") {
      if (status === "COMPLETED" || status === "PAID") throw Object.assign(new Error("Pembayaran sudah disetujui."), { status: 409 });
      await tx.update(payments).set({ status: "REJECTED", rejectionReason: input.reason || "Bukti tidak valid", verifiedAt: now, verifiedByUserId: input.actorUserId } as any).where(eq(payments.id, pay.id));
      await tx.insert(orderStatusHistory).values({ orderId: order.id, fromOrderStatus: order.orderStatus, toOrderStatus: order.orderStatus, fromPaymentStatus: order.paymentStatus, toPaymentStatus: "PENDING", changedByUserId: input.actorUserId, changedByRole: "staff", reason: `Payment rejected: ${input.reason || "invalid proof"}`, createdAt: now } as any);
      return { ok: true, action: "REJECTED" };
    }
    if (status === "COMPLETED" || status === "PAID") return { ok: true, action: "APPROVED", idempotent: true, transactionId: pay.transactionId };
    if (!["PENDING","AWAITING_VERIFICATION","WAITING_PROOF","PENDING_VERIFICATION","REJECTED"].includes(status)) {
      throw Object.assign(new Error(`Status pembayaran tidak dapat disetujui: ${status}`), { status: 409 });
    }
    const total = Number(pay.amount ?? order.grandTotal);
    if (total <= 0 || Math.abs(total - Number(order.grandTotal)) > 0.01) throw Object.assign(new Error("Jumlah pembayaran tidak valid."), { status: 409 });
    if (order.currency && pay.currency && String(order.currency) !== String(pay.currency)) throw Object.assign(new Error("Mata uang tidak cocok."), { status: 409 });
    // Idempotency is enforced by advisory lock + existing transactionId/PAYMENT status above.
    const txId = pay.transactionId && String(pay.status).toUpperCase() === "COMPLETED" ? String(pay.transactionId) : crypto.randomUUID();
    const txNum = `TRX-SF-${Date.now().toString(36).toUpperCase()}`;
    const orderRowItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (!pay.transactionId) {
      await tx.insert(transactions).values({
        id: txId, businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, transactionNumber: txNum,
        paymentMethod: "manual_transfer", paymentStatus: "paid", orderStatus: "completed",
        customerId: order.customerId, customerName: order.customerName,
        subtotal: Number(order.subtotal).toFixed(2), discountTotal: Number(order.discountTotal).toFixed(2),
        taxTotal: Number(order.taxTotal).toFixed(2), grandTotal: Number(order.grandTotal).toFixed(2),
        amountPaid: total.toFixed(2), changeAmount: "0.00", currency: order.currency || "IDR",
        itemCount: orderRowItems.reduce((s:number,i:any)=>s+Number(i.quantity||0),0),
        notes: `Storefront manual transfer verified (order ${order.orderNumber})`,
        completedAt: now, createdAt: now, updatedAt: now,
      } as any);
      for (const it of orderRowItems) {
        await tx.insert(transactionItems).values({ id: crypto.randomUUID(), transactionId: txId, productId: it.productId, productName: it.productName, sku: it.sku, quantity: it.quantity, unitPrice: Number(it.unitPrice).toFixed(2), discountAmount: Number(it.discountTotal||0).toFixed(2), taxAmount: Number(it.taxTotal||0).toFixed(2), subtotal: Number(it.subtotal).toFixed(2), createdAt: now } as any);
      }
    }
    const resRows = await tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, "RESERVED")));
    for (const r of resRows) {
      const [inv] = await tx.select().from(inventory).where(and(eq(inventory.productId, r.productId), eq(inventory.storeId, DEFAULT_STORE_ID))).limit(1).for("update");
      if (inv) {
        const nextReserved = Math.max(0, (inv.reservedQuantity ?? 0) - r.quantity);
        const nextOnHand = Math.max(0, (inv.stockQuantity ?? 0) - r.quantity);
        await tx.update(inventory).set({ reservedQuantity: nextReserved, stockQuantity: nextOnHand, updatedAt: now }).where(eq(inventory.id, inv.id));
        await tx.update(products).set({ stockQuantity: nextOnHand, updatedAt: now } as any).where(eq(products.id, r.productId));
      }
      await tx.update(inventoryReservations).set({ status: "CONVERTED", convertedAt: now, updatedAt: now } as any).where(eq(inventoryReservations.id, r.id));
      await tx.insert(stockMovements).values({ id: crypto.randomUUID(), businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, productId: r.productId, quantityChange: -r.quantity, movementType: "sale", referenceType: "storefront_order_payment", referenceId: order.id, notes: `Paid storefront order ${order.orderNumber}`, performedByUserId: input.actorUserId, createdAt: now } as any);
    }
    await tx.update(payments).set({ status: "COMPLETED", transactionId: txId, paidAt: now, verifiedAt: now, verifiedByUserId: input.actorUserId, rejectionReason: null } as any).where(eq(payments.id, pay.id));
    await tx.update(orders).set({ paymentStatus: "PAID", paidAt: now, linkedTransactionId: txId, updatedAt: now } as any).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromOrderStatus: order.orderStatus, toOrderStatus: order.orderStatus, fromPaymentStatus: order.paymentStatus, toPaymentStatus: "PAID", changedByUserId: input.actorUserId, changedByRole: "staff", reason: "Manual transfer verified; financial records + stock deducted", createdAt: now } as any);
    return { ok: true, action: "APPROVED", transactionId: txId };
  });
}

export async function expireReservations() {
  const now = new Date();
  const expired = await db.select().from(inventoryReservations)
    .where(and(eq(inventoryReservations.status, "RESERVED"), sql`${inventoryReservations.expiresAt} < ${now}`)).limit(200);
  let released = 0;
  for (const r of expired) {
    await db.transaction(async (tx: any) => {
      const [cur] = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, r.id)).limit(1).for("update");
      if (!cur || cur.status !== "RESERVED") return;
      await tx.update(inventoryReservations).set({ status: "EXPIRED", updatedAt: now } as any).where(eq(inventoryReservations.id, r.id));
      const [inv] = await tx.select().from(inventory).where(and(eq(inventory.productId, cur.productId), eq(inventory.storeId, DEFAULT_STORE_ID))).limit(1).for("update");
      if (inv) await tx.update(inventory).set({ reservedQuantity: Math.max(0, (inv.reservedQuantity ?? 0) - cur.quantity), updatedAt: now }).where(eq(inventory.id, inv.id));
      await tx.update(orders).set({ paymentStatus: sql`case when ${orders.paymentStatus} in ('PENDING','UNPAID') then 'EXPIRED' else ${orders.paymentStatus} end`, updatedAt: now } as any).where(eq(orders.id, cur.orderId));
      await tx.update(payments).set({ status: sql`case when ${payments.status} in ('PENDING','pending','AWAITING_VERIFICATION') then 'EXPIRED' else ${payments.status} end` } as any).where(eq(payments.orderId, cur.orderId));
      released++;
    });
  }
  return { released, checked: expired.length };
}
