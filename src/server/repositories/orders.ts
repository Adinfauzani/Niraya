import { db } from "@/server/db";
import { orders, orderItems, orderStatusHistory } from "@/server/db/schema/orders";
import { and, eq, desc, sql, gte, lte } from "drizzle-orm";
import { PaginationParams, PaginatedResult, paginate, findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class OrderRepository {
  private table = orders;
  private idColumn = orders.id;
  private searchableColumns = [orders.orderNumber, orders.customerName, orders.customerPhone];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof orders.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(
    businessId: string,
    params?: PaginationParams & { storeId?: string; orderStatus?: string; paymentStatus?: string; customerId?: string; from?: string; to?: string }
  ): Promise<PaginatedResult<typeof orders.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(orders.businessId, businessId)];

    if (params?.storeId) conditions.push(eq(orders.storeId, params.storeId));
    if (params?.orderStatus) conditions.push(eq(orders.orderStatus, params.orderStatus));
    if (params?.paymentStatus) conditions.push(eq(orders.paymentStatus, params.paymentStatus));
    if (params?.customerId) conditions.push(eq(orders.customerId, params.customerId));
    if (params?.from) conditions.push(sql`${orders.createdAt} >= ${params.from}`);
    if (params?.to) conditions.push(sql`${orders.createdAt} <= ${params.to}`);

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${orders.orderNumber} ILIKE ${searchTerm} OR ${orders.customerName} ILIKE ${searchTerm} OR ${orders.customerPhone} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(whereClause);

    const data = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof orders.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async findByOrderNumber(businessId: string, orderNumber: string) {
    const result = await db
      .select()
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.orderNumber, orderNumber)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByIdempotencyKey(key: string) {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, key))
      .limit(1);
    return result[0] ?? null;
  }

  async findByCustomer(customerId: string) {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async findWithItems(orderId: string) {
    const [order, items, history] = await Promise.all([
      this.findById(orderId),
      db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
      db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt)),
    ]);
    return { order, items, history };
  }

  async createWithItems(
    order: typeof orders.$inferInsert,
    items: typeof orderItems.$inferInsert[]
  ) {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values(order).returning();
      if (items.length > 0) {
        await tx.insert(orderItems).values(items.map(i => ({ ...i, orderId: created.id })));
      }
      await tx.insert(orderStatusHistory).values({
        orderId: created.id,
        toOrderStatus: order.orderStatus,
        changedByRole: "system",
        reason: "Order created",
      } as any);
      return created;
    });
  }

  async updateStatus(
    orderId: string,
    orderStatus: string,
    paymentStatus?: string,
    changedByUserId?: string,
    changedByRole?: string,
    reason?: string
  ) {
    return db.transaction(async (tx) => {
      const updateData: Partial<typeof orders.$inferInsert> = { orderStatus };
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      
      const [updated] = await tx
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();
      if (updated) {
        await tx.insert(orderStatusHistory).values({
          orderId: orderId,
          toOrderStatus: orderStatus,
          toPaymentStatus: paymentStatus ?? null,
          changedByUserId: changedByUserId ?? null,
          changedByRole: changedByRole ?? null,
          reason: reason ?? null,
        } as any);
      }
      return updated;
    });
  }

  async getOrderStats(businessId: string, from: string, to: string) {
    const conditions = [
      eq(orders.businessId, businessId),
      sql`${orders.createdAt} >= ${from}`,
      sql`${orders.createdAt} <= ${to}`,
    ];

    const [totalResult, statusResult, paymentStatusResult, amountResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(orders).where(and(...conditions)),
      db
        .select({ status: orders.orderStatus, count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.orderStatus),
      db
        .select({ status: orders.paymentStatus, count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.paymentStatus),
      db
        .select({ total: sql<number>`coalesce(sum(${orders.grandTotal}), 0)` })
        .from(orders)
        .where(and(...conditions, eq(orders.orderStatus, "COMPLETED"))),
    ]);

    const byOrderStatus: Record<string, number> = {};
    for (const r of statusResult) {
      byOrderStatus[r.status] = Number(r.count);
    }

    const byPaymentStatus: Record<string, number> = {};
    for (const r of paymentStatusResult) {
      byPaymentStatus[r.status] = Number(r.count);
    }

    return {
      total: Number(totalResult[0]?.count ?? 0),
      byOrderStatus,
      byPaymentStatus,
      totalAmount: Number(amountResult[0]?.total ?? 0),
    };
  }

  async create(data: typeof orders.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof orders.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class OrderItemRepository {
  private table = orderItems;
  private idColumn = orderItems.id;
  private searchableColumns = [orderItems.productName, orderItems.sku];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof orderItems.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async create(data: typeof orderItems.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof orderItems.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}