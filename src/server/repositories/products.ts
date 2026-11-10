import { db } from "@/server/db";
import { categories, products, productVariants, productBarcodes } from "@/server/db/schema/products";
import { and, eq, desc, sql } from "drizzle-orm";
import { PaginationParams, PaginatedResult, paginate, findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class CategoryRepository {
  private table = categories;
  private idColumn = categories.id;
  private searchableColumns = [categories.name, categories.description];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof categories.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(businessId: string) {
    return db.select().from(categories).where(eq(categories.businessId, businessId));
  }

  async findActiveByBusiness(businessId: string) {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), eq(categories.status, "active")));
  }

  async findByName(businessId: string, name: string) {
    const result = await db
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), eq(categories.name, name)))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof categories.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof categories.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class ProductRepository {
  private table = products;
  private idColumn = products.id;
  private searchableColumns = [products.name, products.sku, products.barcode];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof products.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(
    businessId: string,
    params?: PaginationParams & { categoryId?: string; status?: string; stockFilter?: string }
  ): Promise<PaginatedResult<typeof products.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(products.businessId, businessId)];

    if (params?.categoryId) conditions.push(eq(products.categoryId, params.categoryId));
    if (params?.status) conditions.push(eq(products.status, params.status));

    if (params?.stockFilter === "low") {
      conditions.push(sql`${products.stockQuantity} > 0 AND ${products.stockQuantity} <= ${products.minimumStock}`);
    } else if (params?.stockFilter === "out") {
      conditions.push(sql`${products.stockQuantity} <= 0`);
    } else if (params?.stockFilter === "ok") {
      conditions.push(sql`${products.stockQuantity} > ${products.minimumStock}`);
    }

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${products.name} ILIKE ${searchTerm} OR ${products.sku} ILIKE ${searchTerm} OR ${products.barcode} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const data = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof products.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async findBySku(businessId: string, sku: string) {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.sku, sku)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByBarcode(businessId: string, barcode: string) {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.barcode, barcode)))
      .limit(1);
    return result[0] ?? null;
  }

  async findActiveByBusiness(businessId: string) {
    return db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.status, "active")));
  }

  async findLowStock(businessId: string) {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.status, "active"),
          sql`${products.stockQuantity} > 0 AND ${products.stockQuantity} <= ${products.minimumStock}`
        )
      );
  }

  async findOutOfStock(businessId: string) {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.status, "active"),
          sql`${products.stockQuantity} <= 0`
        )
      );
  }

  async updateStock(productId: string, quantity: number) {
    const result = await db
      .update(products)
      .set({ stockQuantity: quantity })
      .where(eq(products.id, productId))
      .returning({ id: products.id });
    return result.length > 0;
  }

  async adjustStock(productId: string, delta: number) {
    const result = await db
      .update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${delta}` })
      .where(eq(products.id, productId))
      .returning();
    return result[0] ?? null;
  }

  async create(data: typeof products.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof products.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class ProductVariantRepository {
  private table = productVariants;
  private idColumn = productVariants.id;
  private searchableColumns = [productVariants.name, productVariants.sku];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof productVariants.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByProduct(productId: string) {
    return db.select().from(productVariants).where(eq(productVariants.productId, productId));
  }

  async findActiveByProduct(productId: string) {
    return db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)));
  }

  async findBySku(productId: string, sku: string) {
    const result = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.sku, sku)))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof productVariants.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof productVariants.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class ProductBarcodeRepository {
  private table = productBarcodes;
  private idColumn = productBarcodes.id;
  private searchableColumns = [productBarcodes.barcode];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof productBarcodes.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBarcode(barcode: string) {
    const result = await db.select().from(productBarcodes).where(eq(productBarcodes.barcode, barcode)).limit(1);
    return result[0] ?? null;
  }

  async findByProduct(productId: string) {
    return db.select().from(productBarcodes).where(eq(productBarcodes.productId, productId));
  }

  async create(data: typeof productBarcodes.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof productBarcodes.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}