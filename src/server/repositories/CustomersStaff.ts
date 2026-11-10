import { db } from "@/server/db";
import { customers } from "@/server/db/schema/customers";
import { staff } from "@/server/db/schema/staff";
import { and, eq, desc, sql } from "drizzle-orm";
import { PaginationParams, PaginatedResult, paginate, findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class CustomerRepository {
  private table = customers;
  private idColumn = customers.id;
  private searchableColumns = [customers.name, customers.phone, customers.email];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof customers.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(
    businessId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<typeof customers.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(customers.businessId, businessId)];

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${customers.name} ILIKE ${searchTerm} OR ${customers.phone} ILIKE ${searchTerm} OR ${customers.email} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause);

    const data = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.joinedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof customers.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async findByPhone(businessId: string, phone: string) {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.phone, phone)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByEmail(businessId: string, email: string) {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.email, email)))
      .limit(1);
    return result[0] ?? null;
  }

  async getTotalCount(businessId: string): Promise<number> {
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.businessId, businessId));
    return Number(total);
  }

  async create(data: typeof customers.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof customers.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class StaffRepository {
  private table = staff;
  private idColumn = staff.id;
  private searchableColumns = [staff.name, staff.email];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof staff.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(
    businessId: string,
    params?: PaginationParams & { status?: string }
  ): Promise<PaginatedResult<typeof staff.$inferSelect>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(staff.businessId, businessId)];

    if (params?.status) conditions.push(eq(staff.status, params.status));

    let whereClause = and(...conditions);
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      whereClause = and(
        whereClause,
        sql`(${staff.name} ILIKE ${searchTerm} OR ${staff.email} ILIKE ${searchTerm})`
      );
    }

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .where(whereClause);

    const data = await db
      .select()
      .from(staff)
      .where(whereClause)
      .orderBy(desc(staff.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: data as typeof staff.$inferSelect[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  }

  async findActiveByBusiness(businessId: string) {
    return db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, businessId), eq(staff.status, "active")));
  }

  async findByEmail(businessId: string, email: string) {
    const result = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, businessId), eq(staff.email, email)))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof staff.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof staff.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}