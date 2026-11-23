import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  businesses,
  inventory,
  reservations,
  orders,
  orderItems,
  orderStatusHistory,
  payments,
  products,
  stores,
  stockMovements,
  transactionItems,
  transactions,
} from "@/server/db/schema";

async function loadDefaultBusinessAndStore(tx: any): Promise<{ businessId: string; storeId: string }> {
  const [business] = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.status, "active")).limit(1);
  if (!business) throw Object.assign(new Error("Tidak ada bisnis aktif."), { status: 503 });
  const [store] = await tx.select({ id: stores.id }).from(stores).where(and(eq(stores.businessId, business.id), eq(stores.isActive, true))).limit(1);
  if (!store) throw Object.assign(new Error("Tidak ada toko aktif."), { status: 503 });
  return { businessId: business.id, storeId: store.id };
}

/** Payment proof/verification primitives for storefront/legacy orders. */

export async function submitPaymentProof(input: {
  orderId: string;
  paymentId: string;
  proofUrl: string;
  referenceNumber?: string;
}) {
  const now = new Date();
  const [row] = await db
    .update(payments)
    .set({
      proofUrl: input.proofUrl,
      referenceNumber: input.referenceNumber ?? null,
      proofSubmittedAt: now,
      status: "PENDING_VERIFICATION",
    } as any)
    .where(
      and(eq(payments.id, input.paymentId), eq(payments.orderId, input.orderId)),
    )
    .returning();
  await db
    .update(orders)
    .set({ paymentStatus: "AWAITING_VERIFICATION", updatedAt: now } as any)
    .where(eq(orders.id, input.orderId));
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
    const defaultBusinessId = order.businessId;
    const defaultStoreId = order.storeId;
    const status = String(pay.status).toUpperCase();
    if (input.action === "REJECT") {
      if (status === "COMPLETED" || status === "PAID") throw Object.assign(new Error("Pembayaran sudah disetujui."), { status: 409 });
      await tx
        .update(payments)
        .set({
          status: "REJECTED",
          verificationNote: input.reason || "Bukti tidak valid",
          verifiedAt: now,
          verifiedByUserId: input.actorUserId,
        } as any)
        .where(eq(payments.id, pay.id));
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
    // Transaction already created at storefront checkout; update its payment status instead of inserting a duplicate.
    if (pay.transactionId) {
      await tx.update(transactions)
        .set({ paymentStatus: "paid", updatedAt: now } as any)
        .where(eq(transactions.id, pay.transactionId));
    }
    const resRows = await tx.select().from(reservations).where(and(eq(reservations.orderId, order.id), eq(reservations.status, "RESERVED")));
    for (const r of resRows) {
      const [inv] = await tx.select().from(inventory).where(and(eq(inventory.productId, r.productId), eq(inventory.storeId, defaultStoreId))).limit(1).for("update");
      if (inv) {
        const nextReserved = Math.max(0, (inv.reservedQuantity ?? 0) - r.quantity);
        const nextOnHand = Math.max(0, (inv.stockQuantity ?? 0) - r.quantity);
        await tx.update(inventory).set({ reservedQuantity: nextReserved, stockQuantity: nextOnHand, updatedAt: now }).where(eq(inventory.id, inv.id));
        await tx.update(products).set({ stockQuantity: nextOnHand, updatedAt: now } as any).where(eq(products.id, r.productId));
      }
      await tx.update(reservations).set({ status: "CONVERTED", convertedAt: now, updatedAt: now } as any).where(eq(reservations.id, r.id));
      await tx.insert(stockMovements).values({ id: crypto.randomUUID(), businessId: defaultBusinessId, storeId: defaultStoreId, productId: r.productId, quantityChange: -r.quantity, movementType: "sale", referenceType: "storefront_order_payment", referenceId: order.id, notes: `Paid storefront order ${order.orderNumber}`, performedByUserId: input.actorUserId, createdAt: now } as any);
    }
    await tx
      .update(payments)
      .set({
        status: "COMPLETED",
        transactionId: pay.transactionId,
        paidAt: now,
        verifiedAt: now,
        verifiedByUserId: input.actorUserId,
      } as any)
      .where(eq(payments.id, pay.id));
    await tx.update(orders).set({ paymentStatus: "PAID", paidAt: now, linkedTransactionId: pay.transactionId, updatedAt: now } as any).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromOrderStatus: order.orderStatus, toOrderStatus: order.orderStatus, fromPaymentStatus: order.paymentStatus, toPaymentStatus: "PAID", changedByUserId: input.actorUserId, changedByRole: "staff", reason: "Manual transfer verified; financial records + stock deducted", createdAt: now } as any);
    return { ok: true, action: "APPROVED", transactionId: pay.transactionId };
  });
}

export async function expireReservations() {
  const now = new Date();
  const expired = await db.select().from(reservations)
    .where(and(eq(reservations.status, "RESERVED"), sql`${reservations.expiresAt} < ${now}`)).limit(200);
  let released = 0;
  for (const r of expired) {
    await db.transaction(async (tx: any) => {
      const [cur] = await tx.select().from(reservations).where(eq(reservations.id, r.id)).limit(1).for("update");
      if (!cur || cur.status !== "RESERVED") return;
      await tx.update(reservations).set({ status: "EXPIRED", updatedAt: now } as any).where(eq(reservations.id, r.id));
      const { storeId: defaultStoreId } = await loadDefaultBusinessAndStore(tx);
      const [inv] = await tx.select().from(inventory).where(and(eq(inventory.productId, cur.productId), eq(inventory.storeId, defaultStoreId))).limit(1).for("update");
      if (inv) await tx.update(inventory).set({ reservedQuantity: Math.max(0, (inv.reservedQuantity ?? 0) - cur.quantity), updatedAt: now }).where(eq(inventory.id, inv.id));
      await tx.update(orders).set({ paymentStatus: sql`case when ${orders.paymentStatus} in ('PENDING','UNPAID') then 'EXPIRED' else ${orders.paymentStatus} end`, updatedAt: now } as any).where(eq(orders.id, cur.orderId));
      await tx.update(payments).set({ status: sql`case when ${payments.status} in ('PENDING','pending','AWAITING_VERIFICATION','PENDING_VERIFICATION','WAITING_PROOF') then 'EXPIRED' else ${payments.status} end` } as any).where(eq(payments.orderId, cur.orderId));
      released++;
    });
  }
  return { released, checked: expired.length };
}

export async function cancelUnpaidOrders() {
  const now = new Date();
  // Read auto-cancel flag from OperationalSettings (default true).
  let autoCancel = true;
  try {
    const rows = await db.execute(sql`select "AutoCancelUnpaidOrders" as ac from "settings"."OperationalSettings" where "Id" = 'default' limit 1`);
    const r = (rows as any)?.rows?.[0];
    if (r !== undefined) autoCancel = Boolean(r.ac);
  } catch { /* default true */ }
  if (!autoCancel) return { cancelled: 0, checked: 0, skipped: 0 };

  // Find unpaid orders whose payment deadline passed and no proof was submitted.
  const stale = await db.select({
    id: orders.id, orderNumber: orders.orderNumber, businessId: orders.businessId, storeId: orders.storeId,
    orderStatus: orders.orderStatus, paymentStatus: orders.paymentStatus,
  }).from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(and(
      eq(orders.paymentStatus, "PENDING"),
      eq(payments.status, "PENDING"),
      sql`${payments.expiresAt} < ${now}`,
      sql`${payments.proofSubmittedAt} IS NULL`,
    )).limit(200);

  let cancelled = 0; let skipped = 0;
  for (const o of stale) {
    await db.transaction(async (tx: any) => {
      // Re-lock and re-check to avoid double-cancel under concurrency.
      const [cur] = await tx.select().from(orders).where(eq(orders.id, o.id)).limit(1).for("update");
      if (!cur) return;
      const curStatus = String(cur.orderStatus).toUpperCase();
      const curPayStatus = String(cur.paymentStatus).toUpperCase();
      if (curStatus === "CANCELLED" || curPayStatus !== "PENDING") { skipped++; return; }

      const [pay] = await tx.select().from(payments).where(eq(payments.orderId, o.id)).limit(1).for("update");
      if (!pay || String(pay.status).toUpperCase() !== "PENDING" || pay.proofSubmittedAt !== null) { skipped++; return; }

      // Cancel order (SUBMITTED -> CANCELLED is a valid transition).
      await tx.update(orders).set({ orderStatus: "CANCELLED", paymentStatus: "EXPIRED", cancelReason: "Bukti transfer tidak diunggah dalam waktu 10 menit. Pesanan dibatalkan otomatis.", updatedAt: now } as any).where(eq(orders.id, o.id));
      await tx.update(payments).set({ status: "EXPIRED", updatedAt: now } as any).where(eq(payments.id, pay.id));
      await tx.insert(orderStatusHistory).values({
        orderId: o.id, fromOrderStatus: cur.orderStatus, toOrderStatus: "CANCELLED",
        fromPaymentStatus: cur.paymentStatus, toPaymentStatus: "EXPIRED",
        changedByUserId: null, changedByRole: "system",
        reason: "Auto-cancel: payment proof not submitted within payment expiry window.",
        createdAt: now,
      } as any);

      // Release reservations and restore stock.
      const resRows = await tx.select().from(reservations).where(and(eq(reservations.orderId, o.id), eq(reservations.status, "RESERVED")));
      for (const r of resRows) {
        await tx.update(reservations).set({ status: "EXPIRED", updatedAt: now } as any).where(eq(reservations.id, r.id));
        const [inv] = await tx.select().from(inventory).where(and(eq(inventory.productId, r.productId), eq(inventory.storeId, o.storeId))).limit(1).for("update");
        if (inv) {
          await tx.update(inventory).set({ reservedQuantity: Math.max(0, (inv.reservedQuantity ?? 0) - r.quantity), updatedAt: now }).where(eq(inventory.id, inv.id));
        }
      }
      cancelled++;
    });
  }
  return { cancelled, checked: stale.length, skipped };
}
