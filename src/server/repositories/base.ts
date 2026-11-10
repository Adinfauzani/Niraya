import { db } from "@/server/db";
import { and, eq, desc, asc, sql, count, SQL } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  searchColumns?: PgColumn[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function paginate<T>(
  table: PgTable,
  idColumn: PgColumn,
  params: PaginationParams = { page: 1, pageSize: 20 },
  extraWhere?: SQL
): Promise<PaginatedResult<T>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  let whereClause: SQL | undefined = extraWhere;
  if (params.search && params.searchColumns && params.searchColumns.length > 0) {
    const searchTerm = `%${params.search}%`;
    const conditions = params.searchColumns.map(col => sql`${col} ILIKE ${searchTerm}`);
    const searchClause = sql`(${sql.join(conditions, sql` OR `)})`;
    whereClause = extraWhere ? sql`${extraWhere} AND ${searchClause}` : searchClause;
  }

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(whereClause);

  const data = await db
    .select()
    .from(table)
    .where(whereClause)
    .orderBy(desc(idColumn))
    .limit(pageSize)
    .offset(offset);

  return {
    data: data as T[],
    total: Number(total),
    page,
    pageSize,
    totalPages: Math.ceil(Number(total) / pageSize),
  };
}

export async function findById<T>(table: PgTable, idColumn: PgColumn, id: string): Promise<T | null> {
  const result = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  return (result[0] as T) ?? null;
}

export async function createRecord<TInsert, TSelect>(table: PgTable, data: TInsert): Promise<TSelect> {
  const result = await db.insert(table).values(data as any).returning();
  return result[0] as TSelect;
}

export async function updateRecord<TInsert, TSelect>(table: PgTable, idColumn: PgColumn, id: string, data: Partial<TInsert>): Promise<TSelect | null> {
  const result = await db.update(table).set(data as any).where(eq(idColumn, id)).returning();
  return (result[0] as TSelect) ?? null;
}

export async function deleteRecord(table: PgTable, idColumn: PgColumn, id: string): Promise<boolean> {
  const result = await db.delete(table).where(eq(idColumn, id)).returning({ id: idColumn });
  return result.length > 0;
}

export async function existsRecord(table: PgTable, idColumn: PgColumn, id: string): Promise<boolean> {
  const result = await db.select({ id: idColumn }).from(table).where(eq(idColumn, id)).limit(1);
  return result.length > 0;
}