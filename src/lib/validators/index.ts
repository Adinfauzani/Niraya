import { z } from "zod";

export const idSchema = z.string().uuid("ID tidak valid");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const moneySchema = z.number().min(0).max(999999999);

export const percentageSchema = z.number().min(0).max(100);

export const entityStatusSchema = z.enum(["active", "archived"]);

export const orderTypeSchema = z.enum(["dine-in", "takeaway"]);

export const paymentMethodSchema = z.enum(["cash", "card", "qris", "manual_transfer"]);

export const stockMovementTypeSchema = z.enum(["in", "out", "adjustment", "sale", "void"]);

export const transactionStatusSchema = z.enum(["completed", "voided", "refunded"]);

export const appRoleSchema = z.enum(["user", "cashier", "manager", "admin", "owner"]);

export const businessMemberRoleSchema = z.enum(["owner", "admin", "manager", "cashier", "user"]);

export const businessMemberStatusSchema = z.enum(["invited", "active", "suspended", "removed"]);

export const staffStatusSchema = z.enum(["active", "inactive"]);

export const currencySchema = z.string().length(3).default("IDR");

export const timezoneSchema = z.string().default("Asia/Jakarta");

export const idempotencyKeySchema = z.string().min(8).max(128);

export const maintenanceMessageSchema = z.string().trim().max(2000).optional();

export const maintenanceConfigSchema = z.object({
  enabled: z.boolean(),
  message: maintenanceMessageSchema,
});

export const createCategorySchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  status: entityStatusSchema.default("active"),
  createdAt: z.string().datetime().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().required({ id: true });

export const createProductSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(100).toUpperCase(),
  barcode: z.string().trim().max(100).optional().nullable(),
  categoryId: idSchema.optional().nullable(),
  price: moneySchema,
  cost: moneySchema,
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  imageUrl: z.string().url().max(500).optional().nullable(),
  status: entityStatusSchema.default("active"),
  createdAt: z.string().datetime().optional(),
});

export const updateProductSchema = createProductSchema.partial().required({ id: true });

export const createCustomerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(6).max(30),
  email: z.string().email().max(160).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  joinedAt: z.string().datetime().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().required({ id: true });

export const createStaffSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(160).toLowerCase(),
  role: businessMemberRoleSchema.default("cashier"),
  status: staffStatusSchema.default("active"),
  joinedAt: z.string().datetime().optional(),
});

export const updateStaffSchema = createStaffSchema.partial().required({ id: true });

export const stockAdjustSchema = z.object({
  productId: idSchema,
  mode: stockMovementTypeSchema,
  quantity: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
  staff: z.string().trim().min(1).max(200),
});

export const voidTransactionSchema = z.object({
  id: idSchema,
  reason: z.string().trim().max(500).optional(),
});

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

export const createStoreSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  address: z.string().trim().max(500).optional().nullable(),
  latitude: latitudeSchema.optional().nullable(),
  longitude: longitudeSchema.optional().nullable(),
  phone: z.string().trim().max(60).optional().nullable(),
  email: z.string().email().max(160).optional().nullable(),
  timezone: timezoneSchema,
});

export const updateStoreSchema = createStoreSchema.partial().required({ id: true });

export const posCheckoutSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  items: z.array(z.object({
    productId: idSchema,
    quantity: z.number().int().positive(),
  })).min(1),
  paymentMethod: paymentMethodSchema,
  paymentAmount: moneySchema.optional(),
  customerId: idSchema.optional(),
  customerName: z.string().trim().max(200).optional(),
  customerPhone: z.string().trim().max(30).optional(),
  orderType: orderTypeSchema.default("dine-in"),
  tableNumber: z.string().trim().max(50).optional(),
  discount: z.number().min(0).default(0),
  cashier: z.string().trim().max(200).optional(),
});

export const storefrontCheckoutSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  items: z.array(z.object({
    productId: idSchema,
    variantId: idSchema.optional().nullable(),
    quantity: z.number().int().positive().max(99),
    notes: z.string().max(200).optional(),
  })).min(1).max(100),
  paymentMethod: z.literal("manual_transfer"),
  orderType: orderTypeSchema.optional(),
  notes: z.string().max(500).optional(),
  guest: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(6).max(30),
    email: z.string().email().max(160).optional().or(z.literal("")),
  }).optional(),
});

export const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(1000).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.string().trim().email().max(160).or(z.literal("")).default(""),
  logoUrl: z.string().url().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().url().max(500).optional(),
  socialMedia: z.string().trim().max(2000).optional(),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
  orderEmail: z.boolean().default(true),
  orderSms: z.boolean().default(false),
  orderPush: z.boolean().default(true),
  lowStockEmail: z.boolean().default(true),
  lowStockSms: z.boolean().default(false),
  lowStockPush: z.boolean().default(true),
  paymentEmail: z.boolean().default(true),
  paymentSms: z.boolean().default(false),
  paymentPush: z.boolean().default(true),
  marketingEmail: z.boolean().default(false),
});

export const privacySecuritySettingsSchema = z.object({
  dataRetentionDays: z.number().int().min(1).max(3650).default(365),
  sessionTimeoutMinutes: z.number().int().min(5).max(10080).default(480),
  requireTwoFactor: z.boolean().default(false),
  allowPasswordLogin: z.boolean().default(true),
  allowMagicLink: z.boolean().default(true),
  allowSocialLogin: z.boolean().default(true),
  auditLogEnabled: z.boolean().default(true),
});

export const accountSettingsSchema = z.object({
  defaultUserRole: businessMemberRoleSchema.default("cashier"),
  maxUsers: z.number().int().min(1).max(1000).default(50),
  autoApproveUsers: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
});

export const appearanceSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  fontFamily: z.string().trim().max(100).default("system"),
  language: z.enum(["id", "en"]).default("id"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  compactMode: z.boolean().default(false),
});

export const operationalSettingsSchema = z.object({
  currency: z.literal("IDR").default("IDR"),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).default("Asia/Jakarta"),
  taxRatePercent: percentageSchema,
  memberDiscountRatePercent: percentageSchema,
  lowStockThreshold: z.number().int().min(0).max(100000),
  reservationExpiryMinutes: z.number().int().min(5).max(1440),
  paymentExpiryMinutes: z.number().int().min(5).max(1440),
  autoCancelUnpaidOrders: z.boolean().default(true),
  allowSplitPayment: z.boolean().default(true),
});

export const paymentSettingsSchema = z.object({
  paymentGatewayModuleStatus: z.enum(["NOT_INSTALLED", "INSTALLED", "CONFIGURED"]).default("NOT_INSTALLED"),
  qrManualTransferEnabled: z.boolean().default(true),
  manualTransferBankName: z.string().trim().max(120).default(""),
  manualTransferAccountName: z.string().trim().max(120).default(""),
  manualTransferAccountNumber: z.string().trim().max(120).default(""),
  manualTransferInstructions: z.string().trim().max(1000).default(""),
  manualTransferQrisImageUrl: z.string().trim().max(2_000_000).optional().nullable(),
  acceptCash: z.boolean().default(true),
  acceptCard: z.boolean().default(false),
  acceptQris: z.boolean().default(false),
  acceptTransfer: z.boolean().default(true),
});

export const systemSettingsSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().trim().max(1000).optional(),
  debugMode: z.boolean().default(false),
  apiRateLimit: z.number().int().min(10).max(10000).default(100),
  enableApiDocs: z.boolean().default(false),
  backupEnabled: z.boolean().default(true),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export const receiptSettingsSchema = z.object({
  receiptFooter: z.string().trim().max(240).default(""),
});

export const updateUserRoleSchema = z.object({
  userId: idSchema,
  role: appRoleSchema,
});

export const createPlanSchema = z.object({
  id: z.string().trim().min(1).max(50),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  tier: z.string().trim().min(1).max(20),
  recurrence: z.enum(["monthly", "quarterly", "biannually", "yearly"]),
  intervalMonths: z.number().int().positive(),
  gumroadProductId: z.string().trim().optional().nullable(),
  priceCents: z.number().int().min(0),
  currency: currencySchema,
  entitlements: z.object({
    maxUsers: z.number().int().positive().optional(),
    maxStores: z.number().int().positive().optional(),
    maxProducts: z.number().int().positive().optional(),
    features: z.array(z.string()).optional(),
  }).default({}),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().required({ id: true });

export const businessQuerySchema = paginationSchema.extend({
  categoryId: idSchema.optional(),
  status: entityStatusSchema.optional(),
  stockFilter: z.enum(["low", "out", "ok"]).optional(),
  payment: paymentMethodSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message || "Data tidak valid") as Error & { status?: number; code?: string; issues?: z.ZodIssue[] };
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.issues = result.error.issues;
    throw error;
  }
  return result.data;
}

export function validateOrNull<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}