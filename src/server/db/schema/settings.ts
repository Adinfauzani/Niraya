import {
  boolean,
  check,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { DEFAULT_BUSINESS_ID, settingsSchema } from "./schema";
import { businesses, stores } from "./core";

const s = settingsSchema;

/** Pengaturan tingkat bisnis. */
export const businessSettings = s.table(
  "BusinessSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    businessName: text("BusinessName").notNull(),
    address: text("Address").notNull().default(""),
    phone: text("Phone").notNull().default(""),
    email: text("Email").notNull().default(""),
    currency: text("Currency").notNull().default("IDR"),
    timezone: text("Timezone").notNull().default("Asia/Jakarta"),
    taxRate: numeric("TaxRate", { precision: 5, scale: 4 })
      .notNull()
      .default("0"),
    memberDiscountRate: numeric("MemberDiscountRate", {
      precision: 5,
      scale: 4,
    })
      .notNull()
      .default("0"),
    lowStockThreshold: integer("LowStockThreshold").notNull().default(10),
    /**
     * Kolom lama dipertahankan agar data receipt footer tidak hilang saat
     * migrasi. Sumber baru ada di `ReceiptSettings.Footer`.
     */
    legacyReceiptFooter: text("LegacyReceiptFooter").notNull().default(""),
    qrOrderingEnabled: boolean("QrOrderingEnabled").notNull().default(false),
    qrManualTransferEnabled: boolean("QrManualTransferEnabled")
      .notNull()
      .default(false),
    manualTransferBankName: text("ManualTransferBankName"),
    manualTransferAccountName: text("ManualTransferAccountName"),
    manualTransferAccountNumber: text("ManualTransferAccountNumber"),
    manualTransferInstructions: text("ManualTransferInstructions"),
    manualTransferQrisImageUrl: text("ManualTransferQrisImageUrl"),
    reservationExpiryMinutes: integer("ReservationExpiryMinutes")
      .notNull()
      .default(30),
    paymentGatewayModuleStatus: text("PaymentGatewayModuleStatus")
      .notNull()
      .default("NOT_INSTALLED"),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("BusinessSettings_BusinessId_idx").on(t.businessId),
    check(
      "BusinessSettings_TaxRate_check",
      sql`${t.taxRate} >= 0 and ${t.taxRate} <= 1`
    ),
    check(
      "BusinessSettings_MemberDiscountRate_check",
      sql`${t.memberDiscountRate} >= 0 and ${t.memberDiscountRate} <= 1`
    ),
    check(
      "BusinessSettings_LowStockThreshold_check",
      sql`${t.lowStockThreshold} >= 0`
    ),
  ]
);

/** Override pengaturan per toko. */
export const storeSettings = s.table(
  "StoreSettings",
  {
    id: uuid("Id").defaultRandom().primaryKey(),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    storeId: uuid("StoreId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    lowStockThreshold: integer("LowStockThreshold"),
    taxRate: numeric("TaxRate", { precision: 5, scale: 4 }),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("StoreSettings_StoreId_key").on(t.storeId),
    index("StoreSettings_BusinessId_idx").on(t.businessId),
    check(
      "StoreSettings_TaxRate_check",
      sql`${t.taxRate} is null or (${t.taxRate} >= 0 and ${t.taxRate} <= 1)`
    ),
    check(
      "StoreSettings_LowStockThreshold_check",
      sql`${t.lowStockThreshold} is null or ${t.lowStockThreshold} >= 0`
    ),
  ]
);

/** Konfigurasi struk / receipt. */
export const receiptSettings = s.table(
  "ReceiptSettings",
  {
    id: uuid("Id").defaultRandom().primaryKey(),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    storeId: uuid("StoreId").references(() => stores.id, {
      onDelete: "cascade",
    }),
    header: text("Header").notNull().default(""),
    footer: text("Footer").notNull().default(""),
    showTax: boolean("ShowTax").notNull().default(true),
    showCashier: boolean("ShowCashier").notNull().default(true),
    paperWidth: integer("PaperWidth").notNull().default(58),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ReceiptSettings_BusinessId_idx").on(t.businessId),
    index("ReceiptSettings_StoreId_idx").on(t.storeId),
    check(
      "ReceiptSettings_PaperWidth_check",
      sql`${t.paperWidth} in (58, 80)`
    ),
  ]
);

/** Profil Bisnis — identitas & kontak publik. */
export const businessProfile = s.table(
  "BusinessProfile",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    businessName: text("BusinessName").notNull(),
    address: text("Address").notNull().default(""),
    phone: text("Phone").notNull().default(""),
    email: text("Email").notNull().default(""),
    logoUrl: text("LogoUrl"),
    description: text("Description"),
    website: text("Website"),
    socialMedia: text("SocialMedia"),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("BusinessProfile_BusinessId_idx").on(t.businessId),
  ]
);

/** Notifikasi — preferensi channel & kirim. */
export const notificationSettings = s.table(
  "NotificationSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    emailEnabled: boolean("EmailEnabled").notNull().default(true),
    smsEnabled: boolean("SmsEnabled").notNull().default(false),
    pushEnabled: boolean("PushEnabled").notNull().default(true),
    orderEmail: boolean("OrderEmail").notNull().default(true),
    orderSms: boolean("OrderSms").notNull().default(false),
    orderPush: boolean("OrderPush").notNull().default(true),
    lowStockEmail: boolean("LowStockEmail").notNull().default(true),
    lowStockSms: boolean("LowStockSms").notNull().default(false),
    lowStockPush: boolean("LowStockPush").notNull().default(true),
    paymentEmail: boolean("PaymentEmail").notNull().default(true),
    paymentSms: boolean("PaymentSms").notNull().default(false),
    paymentPush: boolean("PaymentPush").notNull().default(true),
    marketingEmail: boolean("MarketingEmail").notNull().default(false),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("NotificationSettings_BusinessId_idx").on(t.businessId),
  ]
);

/** Privacy & Security — retensi data, sesi, 2FA. */
export const privacySecuritySettings = s.table(
  "PrivacySecuritySettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    dataRetentionDays: integer("DataRetentionDays").notNull().default(365),
    sessionTimeoutMinutes: integer("SessionTimeoutMinutes").notNull().default(480),
    requireTwoFactor: boolean("RequireTwoFactor").notNull().default(false),
    allowPasswordLogin: boolean("AllowPasswordLogin").notNull().default(true),
    allowMagicLink: boolean("AllowMagicLink").notNull().default(true),
    allowSocialLogin: boolean("AllowSocialLogin").notNull().default(true),
    auditLogEnabled: boolean("AuditLogEnabled").notNull().default(true),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("PrivacySecuritySettings_BusinessId_idx").on(t.businessId),
    check(
      "PrivacySecuritySettings_DataRetentionDays_check",
      sql`${t.dataRetentionDays} > 0`
    ),
    check(
      "PrivacySecuritySettings_SessionTimeoutMinutes_check",
      sql`${t.sessionTimeoutMinutes} > 0`
    ),
  ]
);

/** Akun — preferensi akun pengguna. */
export const accountSettings = s.table(
  "AccountSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    defaultUserRole: text("DefaultUserRole").notNull().default("cashier"),
    maxUsers: integer("MaxUsers").notNull().default(50),
    autoApproveUsers: boolean("AutoApproveUsers").notNull().default(false),
    requireEmailVerification: boolean("RequireEmailVerification").notNull().default(true),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("AccountSettings_BusinessId_idx").on(t.businessId),
    check(
      "AccountSettings_MaxUsers_check",
      sql`${t.maxUsers} > 0`
    ),
  ]
);

/** Tampilan — tema, bahasa, UI. */
export const appearanceSettings = s.table(
  "AppearanceSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    theme: text("Theme").notNull().default("system"),
    primaryColor: text("PrimaryColor").notNull().default("#2563eb"),
    fontFamily: text("FontFamily").notNull().default("system"),
    language: text("Language").notNull().default("id"),
    dateFormat: text("DateFormat").notNull().default("DD/MM/YYYY"),
    timeFormat: text("TimeFormat").notNull().default("24h"),
    compactMode: boolean("CompactMode").notNull().default(false),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("AppearanceSettings_BusinessId_idx").on(t.businessId),
  ]
);

/** Operasional — currency, timezone, pajak, diskon, stok, reservasi. */
export const operationalSettings = s.table(
  "OperationalSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    currency: text("Currency").notNull().default("IDR"),
    timezone: text("Timezone").notNull().default("Asia/Jakarta"),
    taxRate: numeric("TaxRate", { precision: 5, scale: 4 })
      .notNull()
      .default("0"),
    memberDiscountRate: numeric("MemberDiscountRate", {
      precision: 5,
      scale: 4,
    })
      .notNull()
      .default("0"),
    lowStockThreshold: integer("LowStockThreshold").notNull().default(10),
    reservationExpiryMinutes: integer("ReservationExpiryMinutes")
      .notNull()
      .default(30),
    paymentExpiryMinutes: integer("PaymentExpiryMinutes")
      .notNull()
      .default(10),
    autoCancelUnpaidOrders: boolean("AutoCancelUnpaidOrders").notNull().default(true),
    allowSplitPayment: boolean("AllowSplitPayment").notNull().default(true),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("OperationalSettings_BusinessId_idx").on(t.businessId),
    check(
      "OperationalSettings_TaxRate_check",
      sql`${t.taxRate} >= 0 and ${t.taxRate} <= 1`
    ),
    check(
      "OperationalSettings_MemberDiscountRate_check",
      sql`${t.memberDiscountRate} >= 0 and ${t.memberDiscountRate} <= 1`
    ),
    check(
      "OperationalSettings_LowStockThreshold_check",
      sql`${t.lowStockThreshold} >= 0`
    ),
  ]
);

/** Pembayaran — gateway, manual transfer. */
export const paymentSettings = s.table(
  "PaymentSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    paymentGatewayModuleStatus: text("PaymentGatewayModuleStatus")
      .notNull()
      .default("NOT_INSTALLED"),
    qrManualTransferEnabled: boolean("QrManualTransferEnabled")
      .notNull()
      .default(false),
    manualTransferBankName: text("ManualTransferBankName"),
    manualTransferAccountName: text("ManualTransferAccountName"),
    manualTransferAccountNumber: text("ManualTransferAccountNumber"),
    manualTransferInstructions: text("ManualTransferInstructions"),
    manualTransferQrisImageUrl: text("ManualTransferQrisImageUrl"),
    acceptCash: boolean("AcceptCash").notNull().default(true),
    acceptCard: boolean("AcceptCard").notNull().default(false),
    acceptQris: boolean("AcceptQris").notNull().default(false),
    acceptTransfer: boolean("AcceptTransfer").notNull().default(true),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("PaymentSettings_BusinessId_idx").on(t.businessId),
  ]
);

/** Sistem — debug, system-level. */
export const systemSettings = s.table(
  "SystemSettings",
  {
    id: text("Id").primaryKey().default("default"),
    businessId: uuid("BusinessId")
      .notNull()
      .default(DEFAULT_BUSINESS_ID)
      .references(() => businesses.id, { onDelete: "cascade" }),
    debugMode: boolean("DebugMode").notNull().default(false),
    apiRateLimit: integer("ApiRateLimit").notNull().default(100),
    enableApiDocs: boolean("EnableApiDocs").notNull().default(false),
    backupEnabled: boolean("BackupEnabled").notNull().default(true),
    backupFrequency: text("BackupFrequency").notNull().default("daily"),
    createdAt: timestamp("CreatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("UpdatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("SystemSettings_BusinessId_idx").on(t.businessId),
  ]
);
