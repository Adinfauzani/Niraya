import { db } from "@/server/db";
import { businesses, stores, userProfiles, businessMembers, roles, permissions, rolePermissions } from "@/server/db/schema/core";
import { and, eq, desc, sql } from "drizzle-orm";
import { PaginationParams, PaginatedResult, paginate, findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class BusinessRepository {
  private table = businesses;
  private idColumn = businesses.id;
  private searchableColumns = [businesses.name, businesses.slug, businesses.ownerUserId];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof businesses.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByOwner(ownerUserId: string) {
    return db.select().from(businesses).where(eq(businesses.ownerUserId, ownerUserId));
  }

  async findBySlug(slug: string) {
    const result = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    return result[0] ?? null;
  }

  async findActiveWithMembership(userId: string) {
    return db
      .select({ business: businesses })
      .from(businesses)
      .innerJoin(businessMembers, eq(businessMembers.businessId, businesses.id))
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active"),
          eq(businesses.status, "active")
        )
      );
  }

  async create(data: typeof businesses.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof businesses.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class StoreRepository {
  private table = stores;
  private idColumn = stores.id;
  private searchableColumns = [stores.name, stores.code, stores.address];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof stores.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByBusiness(businessId: string) {
    return db.select().from(stores).where(eq(stores.businessId, businessId));
  }

  async findActiveByBusiness(businessId: string) {
    return db
      .select()
      .from(stores)
      .where(and(eq(stores.businessId, businessId), eq(stores.isActive, true)));
  }

  async findDefaultByBusiness(businessId: string) {
    const result = await db
      .select()
      .from(stores)
      .where(and(eq(stores.businessId, businessId), eq(stores.isActive, true)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByCode(businessId: string, code: string) {
    const result = await db
      .select()
      .from(stores)
      .where(and(eq(stores.businessId, businessId), eq(stores.code, code)))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof stores.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof stores.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class UserProfileRepository {
  private table = userProfiles;
  private idColumn = userProfiles.id;
  private searchableColumns = [userProfiles.name, userProfiles.email];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof userProfiles.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByAuthUserId(authUserId: string) {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.id, authUserId)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string) {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findByBusiness(businessId: string) {
    return db
      .select({ profile: userProfiles })
      .from(userProfiles)
      .innerJoin(businessMembers, eq(businessMembers.userId, userProfiles.id))
      .where(eq(businessMembers.businessId, businessId));
  }

  async create(data: typeof userProfiles.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof userProfiles.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class BusinessMemberRepository {
  private table = businessMembers;
  private idColumn = businessMembers.id;
  private searchableColumns = [businessMembers.userId, businessMembers.businessId];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof businessMembers.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByUserAndBusiness(userId: string, businessId: string) {
    const result = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.userId, userId), eq(businessMembers.businessId, businessId)))
      .limit(1);
    return result[0] ?? null;
  }

  async findActiveByUser(userId: string) {
    return db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, "active")));
  }

  async findActiveByBusiness(businessId: string) {
    return db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.status, "active")));
  }

  async findWithProfileByBusiness(businessId: string) {
    return db
      .select({
        member: businessMembers,
        profile: userProfiles,
      })
      .from(businessMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, businessMembers.userId))
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.status, "active")));
  }

  async updateStatus(id: string, status: "active" | "suspended" | "removed") {
    const result = await db
      .update(businessMembers)
      .set({ status })
      .where(eq(businessMembers.id, id))
      .returning({ id: businessMembers.id });
    return result.length > 0;
  }

  async updateRole(id: string, role: string) {
    const result = await db
      .update(businessMembers)
      .set({ role })
      .where(eq(businessMembers.id, id))
      .returning({ id: businessMembers.id });
    return result.length > 0;
  }

  async updateStore(id: string, storeId: string | null) {
    const result = await db
      .update(businessMembers)
      .set({ storeId })
      .where(eq(businessMembers.id, id))
      .returning({ id: businessMembers.id });
    return result.length > 0;
  }

  async create(data: typeof businessMembers.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof businessMembers.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class RoleRepository {
  private table = roles;
  private idColumn = roles.code;
  private searchableColumns = [roles.name, roles.description];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof roles.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByName(name: string) {
    const result = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findByCode(code: string) {
    const result = await db.select().from(roles).where(eq(roles.code, code)).limit(1);
    return result[0] ?? null;
  }

  async findWithPermissions() {
    const rolesData = await db.select().from(roles);
    const roleCodes = rolesData.map(r => r.code);
    if (roleCodes.length === 0) return [];

    const perms = await db
      .select({ roleCode: rolePermissions.roleCode, permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.code, rolePermissions.permissionCode))
      .where(sql`${rolePermissions.roleCode} IN (${roleCodes.join(",")})`);

    const permMap = new Map<string, typeof permissions.$inferSelect[]>();
    for (const p of perms) {
      if (!permMap.has(p.roleCode)) permMap.set(p.roleCode, []);
      permMap.get(p.roleCode)!.push(p.permission);
    }

    return rolesData.map(r => ({ ...r, permissions: permMap.get(r.code) ?? [] }));
  }

  async create(data: typeof roles.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof roles.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class PermissionRepository {
  private table = permissions;
  private idColumn = permissions.code;
  private searchableColumns = [permissions.name, permissions.description];

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<typeof permissions.$inferSelect>> {
    return paginate(this.table, this.idColumn, params);
  }

  async findByName(name: string) {
    const result = await db.select().from(permissions).where(eq(permissions.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findByModule(module: string) {
    return db.select().from(permissions).where(eq(permissions.module, module));
  }

  async create(data: typeof permissions.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof permissions.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}