import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { orderItems, orders, orderStatusHistory, payments } from "@/server/db/schema";
import type {
  Order,
  OrderCounts,
  OrderItem,
  OrderSource,
  OrderStatus,
} from "@/types/business";

const ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

const ORDER_SOURCES: OrderSource[] = [
  "POS",
  "STOREFRONT",
  "QR_TABLE",
  "QR_GENERAL",
];

/** Allowed forward transitions. Terminal states (COMPLETED/CANCELLED) have none. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const money = (value: string | null | undefined) => Number(value ?? 0);
const iso = (value: Date | string) => new Date(value).toISOString();

function httpError(message: string, status: number): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

export async function listOrders(options: {
  businessId: string;
  storeId: string;
  status?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
}): Promise<Order[]> {
  const { businessId, storeId } = options;

  const conditions = [
    eq(orders.businessId, businessId),
    eq(orders.storeId, storeId),
  ];
  if (options.status && options.status !== "all" && isOrderStatus(options.status)) {
    conditions.push(eq(orders.orderStatus, options.status));
  }
  if (options.from) {
    conditions.push(sql`${orders.createdAt} >= ${new Date(options.from + 'T00:00:00').toISOString()}`);
  }
  if (options.to) {
    conditions.push(sql`${orders.createdAt} <= ${new Date(options.to + 'T23:59:59.999').toISOString()}`);
  }

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);

  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id)
      )
    );

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      discountTotal: money(item.discountTotal),
      taxTotal: money(item.taxTotal),
      subtotal: money(item.subtotal),
      notes: item.notes,
    });
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    number: row.orderNumber,
    source: (ORDER_SOURCES.includes(row.orderSource as OrderSource)
      ? row.orderSource
      : "POS") as OrderSource,
    status: (ORDER_STATUSES.includes(row.orderStatus as OrderStatus)
      ? row.orderStatus
      : "SUBMITTED") as OrderStatus,
    paymentStatus: row.paymentStatus as Order["paymentStatus"],
    customerName: row.customerName ?? "Pelanggan",
    customerPhone: row.customerPhone,
    orderType: row.orderType,
    tableNumber: row.tableNumber,
    paymentMethod: row.paymentMethod,
    currency: row.currency,
    subtotal: money(row.subtotal),
    discountTotal: money(row.discountTotal),
    taxTotal: money(row.taxTotal),
    grandTotal: money(row.grandTotal),
    amountPaid: row.amountPaid === null ? null : money(row.amountPaid),
    notes: row.notes,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    items: itemsByOrder.get(row.id) ?? [],
  }));
}

export async function getOrderCounts(options: {
  businessId: string;
  storeId: string;
  from?: string | null;
  to?: string | null;
}): Promise<OrderCounts> {
  const { businessId, storeId } = options;

  const conditions = [
    eq(orders.businessId, businessId),
    eq(orders.storeId, storeId),
  ];
  if (options.from) {
    conditions.push(sql`${orders.createdAt} >= ${new Date(options.from + 'T00:00:00').toISOString()}`);
  }
  if (options.to) {
    conditions.push(sql`${orders.createdAt} <= ${new Date(options.to + 'T23:59:59.999').toISOString()}`);
  }

  const rows = await db
    .select({
      status: orders.orderStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(orders.orderStatus);

  const counts: OrderCounts = {
    DRAFT: 0,
    SUBMITTED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    pending: 0,
  };

  for (const row of rows) {
    if (isOrderStatus(row.status)) {
      counts[row.status] = Number(row.count);
    }
  }
  counts.pending = counts.SUBMITTED;

  return counts;
}

export async function updateOrderStatus(options: {
  businessId: string;
  storeId: string;
  orderId: string;
  status: OrderStatus;
  changedByUserId?: string | null;
  changedByRole?: string | null;
  reason?: string | null;
}): Promise<{ ok: true }> {
  const {
    businessId,
    storeId,
    orderId,
    status: nextStatus,
    changedByUserId,
    changedByRole,
    reason,
  } = options;

  if (!isOrderStatus(nextStatus)) {
    throw httpError("Status pesanan tidak valid.", 400);
  }

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.businessId, businessId),
          eq(orders.storeId, storeId)
        )
      )
      .for("update")
      .limit(1);

    if (!order) {
      throw httpError("Pesanan tidak ditemukan.", 404);
    }

    const currentStatus = order.orderStatus as OrderStatus;

    if (currentStatus === nextStatus) {
      return;
    }

    if (!TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      throw httpError(
        `Tidak dapat mengubah status dari ${currentStatus} ke ${nextStatus}.`,
        400
      );
    }

    const now = new Date();

    await tx
      .update(orders)
      .set({
        orderStatus: nextStatus,
        updatedAt: now,
        completedAt: nextStatus === "COMPLETED" ? now : order.completedAt,
        cancelReason:
          nextStatus === "CANCELLED"
            ? reason ?? "Cancelled"
            : order.cancelReason,
      })
      .where(eq(orders.id, order.id));

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromOrderStatus: currentStatus,
      toOrderStatus: nextStatus,
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: order.paymentStatus,
      changedByUserId: changedByUserId ?? null,
      changedByRole: changedByRole ?? null,
      reason: reason ?? null,
      createdAt: now,
    } as typeof orderStatusHistory.$inferInsert);
  });

  return { ok: true };
}

export type OrderPaymentDetail = {
  id: string;
  status: string;
  method: string;
  amount: number;
  proofSubmittedAt: string | null;
  referenceNumber: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  hasProof: boolean;
  expiresAt: string | null;
  currency: string;
};

export async function getOrderDetail(options: {
  businessId: string;
  storeId: string;
  orderId: string;
}): Promise<(Order & { payments: OrderPaymentDetail[] }) | null> {
  const { businessId, storeId, orderId } = options;

  const [row] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.businessId, businessId),
        eq(orders.storeId, storeId)
      )
    )
    .limit(1);

  if (!row) return null;

  const [items, payRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, row.id)),
    db
      .select({
        id: payments.id,
        status: payments.status,
        method: payments.paymentMethod,
        amount: payments.amount,
        currency: payments.currency,
        proofUrl: payments.proofUrl,
        proofSubmittedAt: payments.proofSubmittedAt,
        referenceNumber: payments.referenceNumber,
        verifiedAt: payments.verifiedAt,
        verificationNote: payments.verificationNote,
        expiresAt: payments.expiresAt,
      })
      .from(payments)
      .where(eq(payments.orderId, row.id))
      .orderBy(desc(payments.createdAt)),
  ]);

  const mappedItems: OrderItem[] = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: money(item.unitPrice),
    discountTotal: money(item.discountTotal),
    taxTotal: money(item.taxTotal),
    subtotal: money(item.subtotal),
    notes: item.notes,
  }));

  const mappedPayments: OrderPaymentDetail[] = payRows.map((p) => ({
    id: p.id,
    status: String(p.status ?? ""),
    method: String(p.method ?? ""),
    amount: money(p.amount),
    currency: String(p.currency ?? row.currency ?? "IDR"),
    proofSubmittedAt: p.proofSubmittedAt ? iso(p.proofSubmittedAt) : null,
    referenceNumber: p.referenceNumber ?? null,
    verifiedAt: p.verifiedAt ? iso(p.verifiedAt) : null,
    verificationNote: p.verificationNote ?? null,
    hasProof: !!p.proofUrl,
    expiresAt: p.expiresAt ? iso(p.expiresAt) : null,
  }));

  return {
    id: row.id,
    number: row.orderNumber,
    source: (ORDER_SOURCES.includes(row.orderSource as OrderSource)
      ? row.orderSource
      : "POS") as OrderSource,
    status: (ORDER_STATUSES.includes(row.orderStatus as OrderStatus)
      ? row.orderStatus
      : "SUBMITTED") as OrderStatus,
    paymentStatus: row.paymentStatus as Order["paymentStatus"],
    customerName: row.customerName ?? "Pelanggan",
    customerPhone: row.customerPhone,
    orderType: row.orderType,
    tableNumber: row.tableNumber,
    paymentMethod: row.paymentMethod,
    currency: row.currency,
    subtotal: money(row.subtotal),
    discountTotal: money(row.discountTotal),
    taxTotal: money(row.taxTotal),
    grandTotal: money(row.grandTotal),
    amountPaid: row.amountPaid === null ? null : money(row.amountPaid),
    notes: row.notes,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    items: mappedItems,
    payments: mappedPayments,
  };
}