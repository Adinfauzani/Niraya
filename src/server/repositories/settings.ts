import { db } from "@/server/db";
import {
  businessSettings,
  storeSettings,
  receiptSettings,
  businessProfile,
  notificationSettings,
  privacySecuritySettings,
  accountSettings,
  appearanceSettings,
  operationalSettings,
  paymentSettings,
  systemSettings,
} from "@/server/db/schema/settings";
import { and, eq } from "drizzle-orm";
import { findById, createRecord, updateRecord, deleteRecord, existsRecord } from "./base";

export class BusinessSettingsRepository {
  private table = businessSettings;
  private idColumn = businessSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(businessSettings).where(eq(businessSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof businessSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof businessSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof businessSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class StoreSettingsRepository {
  private table = storeSettings;
  private idColumn = storeSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByStore(storeId: string) {
    const result = await db.select().from(storeSettings).where(eq(storeSettings.storeId, storeId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof storeSettings.$inferInsert) {
    const storeId = data.storeId;
    if (!storeId) {
      throw new Error("storeId is required for upsert");
    }
    const existing = await this.findByStore(storeId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof storeSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof storeSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class ReceiptSettingsRepository {
  private table = receiptSettings;
  private idColumn = receiptSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(receiptSettings).where(eq(receiptSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof receiptSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof receiptSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof receiptSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class BusinessProfileRepository {
  private table = businessProfile;
  private idColumn = businessProfile.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(businessProfile).where(eq(businessProfile.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof businessProfile.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof businessProfile.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof businessProfile.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class NotificationSettingsRepository {
  private table = notificationSettings;
  private idColumn = notificationSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(notificationSettings).where(eq(notificationSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof notificationSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof notificationSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof notificationSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class PrivacySecuritySettingsRepository {
  private table = privacySecuritySettings;
  private idColumn = privacySecuritySettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(privacySecuritySettings).where(eq(privacySecuritySettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof privacySecuritySettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof privacySecuritySettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof privacySecuritySettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class AccountSettingsRepository {
  private table = accountSettings;
  private idColumn = accountSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(accountSettings).where(eq(accountSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof accountSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof accountSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof accountSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class AppearanceSettingsRepository {
  private table = appearanceSettings;
  private idColumn = appearanceSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(appearanceSettings).where(eq(appearanceSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof appearanceSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof appearanceSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof appearanceSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class OperationalSettingsRepository {
  private table = operationalSettings;
  private idColumn = operationalSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(operationalSettings).where(eq(operationalSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof operationalSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof operationalSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof operationalSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class PaymentSettingsRepository {
  private table = paymentSettings;
  private idColumn = paymentSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(paymentSettings).where(eq(paymentSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof paymentSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof paymentSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof paymentSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}

export class SystemSettingsRepository {
  private table = systemSettings;
  private idColumn = systemSettings.id;

  async findById(id: string) {
    return findById(this.table, this.idColumn, id);
  }

  async findByBusiness(businessId: string) {
    const result = await db.select().from(systemSettings).where(eq(systemSettings.businessId, businessId)).limit(1);
    return result[0] ?? null;
  }

  async upsert(data: typeof systemSettings.$inferInsert) {
    const businessId = data.businessId;
    if (!businessId) {
      throw new Error("businessId is required for upsert");
    }
    const existing = await this.findByBusiness(businessId);
    if (existing) {
      const updated = await updateRecord(this.table, this.idColumn, existing.id, data);
      return updated!;
    }
    return createRecord(this.table, data);
  }

  async create(data: typeof systemSettings.$inferInsert) {
    return createRecord(this.table, data);
  }

  async update(id: string, data: Partial<typeof systemSettings.$inferInsert>) {
    return updateRecord(this.table, this.idColumn, id, data);
  }

  async delete(id: string) {
    return deleteRecord(this.table, this.idColumn, id);
  }

  async exists(id: string) {
    return existsRecord(this.table, this.idColumn, id);
  }
}