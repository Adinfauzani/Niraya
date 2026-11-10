import { db } from "@/server/db";
import { inventory, stockMovements, stockAdjustments } from "@/server/db/schema/inventory";
import { and, eq, desc, sql } from "drizzle-orm";
import { PaginationParams, PaginatedResult, paginate, findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class InventoryRepository {
  private table = inventory;
  private idColumn = inventory.id;
  private searchableColumns: never[] = [];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof inventory.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByProductAndStore(productId: string, storeId: string) {
    const result = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.storeId, storeId)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByStore(storeId: string) {
    return db.select().from(inventory).where(eq(inventory.storeId, storeId));
  }

  async findByProduct(productId: string) {
    return db.select().from(inventory).where(eq(inventory.productId, productId));
  }

  async findLowStock(storeId: string) {
    return db
      .select()
      .from(inventory)
      .where(and(eq(inventory.storeId, storeId), sql`${inventory.stockQuantity} > 0 AND ${inventory.stockQuantity} <= ${inventory.minimumStock}`));
  }

  async findOutOfStock(storeId: string) {
    return db
      .select()
      .from(inventory)
      .where(and(eq(inventory.storeId, storeId), sql`${inventory.stockQuantity} <= 0`));
  }

  async adjustQuantity(productId: string, storeId: string, delta: number) {
    const result = await db
      .update(inventory)
      .set({ stockQuantity: sql`${inventory.stockQuantity} + ${delta}` })
      .where(and(eq(inventory.productId, productId), eq(inventory.storeId, storeId)))
      .returning();
    return result[0] ?? null;
  }

  async setQuantity(productId: string, storeId: string, quantity: number) {
    const result = await db
      .update(inventory)
      .set({ stockQuantity: quantity })
      .where(and(eq(inventory.productId, productId), eq(inventory.storeId, storeId)))
      .returning();
    return result[0] ?? null;
  }

  async upsert(productId: string, storeId: string, quantity: number, minimumStock: number = 0) {
    const existing = await this.findByProductAndStore(productId, storeId);
    if (existing) {
      return (await this.setQuantity(productId, storeId, quantity))!;
    }
    return this.create({ productId, storeId, stockQuantity: quantity, minimumStock });
  }

  async create(data: typeof inventory.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof inventory.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class StockMovementRepository {
  private table = stockMovements;
  private idColumn = stockMovements.id;
  private searchableColumns = [stockMovements.referenceId, stockMovements.note];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof stockMovements.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByStore(
    storeId: string,
    params?: PaginationParams & { productId?: string; movementType?: string; from?: string; to?: string }
  ): Promise<PaginatedResult<typeof stockMovements.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(stockMovements.storeId, storeId)];

    if (params?.productId) conditions.push(eq(stockMovements.productId, params.productId));
    if (params?.movementType) conditions.push(eq(stockMovements.movementType, params.movementType));
    if (params?.from) conditions.push(sql`${stockMovements.createdAt} >= ${params.from}`);
    if (params?.to) conditions.push(sql`${stockMovements.createdAt} <= ${params.to}`);

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${stockMovements.referenceId} ILIKE ${searchTerm} OR ${stockMovements.note} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockMovements)
      .where(whereClause);

    const data = await db
      .select()
      .from(stockMovements)
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof stockMovements.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async findByReferenceId(referenceId: string) {
    return db.select().from(stockMovements).where(eq(stockMovements.referenceId, referenceId));
  }

  async createMovement(data: typeof stockMovements.$inferInsert) {
    return createRecord(this.table, data);
  }

  async create(data: typeof stockMovements.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof stockMovements.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class StockAdjustmentRepository {
  private table = stockAdjustments;
  private idColumn = stockAdjustments.id;
  private searchableColumns = [stockAdjustments.reason, stockAdjustments.notes];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof stockAdjustments.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByStore(
    storeId: string,
    params?: PaginationParams & { productId?: string; from?: string; to?: string }
  ): Promise<PaginatedResult<typeof stockAdjustments.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(stockAdjustments.storeId, storeId)];

    if (params?.productId) conditions.push(eq(stockAdjustments.productId, params.productId));
    if (params?.from) conditions.push(sql`${stockAdjustments.createdAt} >= ${params.from}`);
    if (params?.to) conditions.push(sql`${stockAdjustments.createdAt} <= ${params.to}`);

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${stockAdjustments.reason} ILIKE ${searchTerm} OR ${stockAdjustments.notes} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockAdjustments)
      .where(whereClause);

    const data = await db
      .select()
      .from(stockAdjustments)
      .where(whereClause)
      .orderBy(desc(stockAdjustments.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof stockAdjustments.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async create(data: typeof stockAdjustments.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof stockAdjustments.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}