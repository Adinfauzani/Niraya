import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import {
  businesses,
  businessSettings,
  businessProfile,
  notificationSettings,
  privacySecuritySettings,
  accountSettings,
  appearanceSettings,
  operationalSettings,
  paymentSettings,
  systemSettings,
  receiptSettings,
} from "@/server/db/schema";
import { ACTION_ROLES, ensureUserProfile, requireRole } from "@/server/auth/session";
import { requireTenantContext, requireAnyRole } from "@/server/auth/authorization";

export const runtime = "nodejs";

function moneyPercentToRate(v: unknown, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n / 100));
}

const profileSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(1000).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.string().trim().email().max(160).or(z.literal("")).default(""),
  logoUrl: z.string().url().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().url().max(500).optional(),
  socialMedia: z.string().trim().max(2000).optional(),
});

const notificationSchema = z.object({
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

const privacySecuritySchema = z.object({
  dataRetentionDays: z.number().int().min(1).max(3650).default(365),
  sessionTimeoutMinutes: z.number().int().min(5).max(10080).default(480),
  requireTwoFactor: z.boolean().default(false),
  allowPasswordLogin: z.boolean().default(true),
  allowMagicLink: z.boolean().default(true),
  allowSocialLogin: z.boolean().default(true),
  auditLogEnabled: z.boolean().default(true),
});

const accountSchema = z.object({
  defaultUserRole: z.enum(["owner", "admin", "manager", "cashier", "staff"]).default("cashier"),
  maxUsers: z.number().int().min(1).max(1000).default(50),
  autoApproveUsers: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
});

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  fontFamily: z.string().trim().max(100).default("system"),
  language: z.enum(["id", "en"]).default("id"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  compactMode: z.boolean().default(false),
});

const operationalSchema = z.object({
  currency: z.literal("IDR").default("IDR"),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).default("Asia/Jakarta"),
  taxRatePercent: z.number().min(0).max(100),
  memberDiscountRatePercent: z.number().min(0).max(100),
  lowStockThreshold: z.number().int().min(0).max(100000),
  reservationExpiryMinutes: z.number().int().min(5).max(1440),
  autoCancelUnpaidOrders: z.boolean().default(true),
  allowSplitPayment: z.boolean().default(true),
});

const paymentSchema = z.object({
  paymentGatewayModuleStatus: z.enum(["NOT_INSTALLED", "INSTALLED", "CONFIGURED"]).default("NOT_INSTALLED"),
  qrManualTransferEnabled: z.boolean().default(false),
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

const systemSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().trim().max(1000).optional(),
  debugMode: z.boolean().default(false),
  apiRateLimit: z.number().int().min(10).max(10000).default(100),
  enableApiDocs: z.boolean().default(false),
  backupEnabled: z.boolean().default(true),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

const receiptSchema = z.object({
  receiptFooter: z.string().trim().max(240).default(""),
});

async function requireSettingsAccess() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any };
  await ensureUserProfile(user);
  try { await requireRole(ACTION_ROLES["settings.update"] || "admin"); }
  catch (e: any) { return { error: NextResponse.json({ error: e?.message || "Akses ditolak." }, { status: e?.status || 403 }) }; }
  return { user };
}

async function getTenantIds() {
  const { headers } = await import("next/headers");
  const headersStore = await headers();
  return {
    businessId: headersStore.get("x-tenant-business-id"),
    storeId: headersStore.get("x-tenant-store-id"),
  };
}

async function loadTableOrNull(table: any, where: any) {
  try {
    const [row] = await db.select().from(table).where(where).limit(1);
    return row ?? null;
  } catch (e: any) {
    if (e?.code !== "42703" && e?.cause?.code !== "42703") throw e;
    return null;
  }
}

export async function GET() {
  try {
    const auth = await requireSettingsAccess();
    if ((auth as any).error) return (auth as any).error;

    // Use tenant context from middleware headers instead of DEFAULT_BUSINESS_ID
    const { businessId, storeId } = await getTenantIds();
    const settingsId = businessId || "default";

    const loadPaymentOrNull = async () => {
      try {
        const [row] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, settingsId)).limit(1);
        return row ?? null;
      } catch (e: any) {
        if (e?.code !== "42703" && e?.cause?.code !== "42703") throw e;
        try {
          const rows = await db.execute(sql`
            select "Id","BusinessId","PaymentGatewayModuleStatus","QrManualTransferEnabled",
              "ManualTransferBankName","ManualTransferAccountName","ManualTransferAccountNumber","ManualTransferInstructions",
              "AcceptCash","AcceptCard","AcceptQris","AcceptTransfer","CreatedAt","UpdatedAt"
            from "settings"."PaymentSettings" where "Id" = ${settingsId} limit 1
          `);
          const r = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
          if (!r) return null;
          return {
            id: r.Id, businessId: r.BusinessId, paymentGatewayModuleStatus: r.PaymentGatewayModuleStatus,
            qrManualTransferEnabled: r.QrManualTransferEnabled, manualTransferBankName: r.ManualTransferBankName,
            manualTransferAccountName: r.ManualTransferAccountName, manualTransferAccountNumber: r.ManualTransferAccountNumber,
            manualTransferInstructions: r.ManualTransferInstructions, manualTransferQrisImageUrl: null,
            acceptCash: r.AcceptCash, acceptCard: r.AcceptCard, acceptQris: r.AcceptQris, acceptTransfer: r.AcceptTransfer,
            createdAt: r.CreatedAt, updatedAt: r.UpdatedAt,
          } as any;
        } catch {
          return null;
        }
      }
    };

    const [
      profile,
      notifications,
      privacySecurity,
      account,
      appearance,
      operational,
      payment,
      system,
      receipt,
      business,
    ] = await Promise.all([
      loadTableOrNull(businessProfile, eq(businessProfile.id, settingsId)),
      loadTableOrNull(notificationSettings, eq(notificationSettings.id, settingsId)),
      loadTableOrNull(privacySecuritySettings, eq(privacySecuritySettings.id, settingsId)),
      loadTableOrNull(accountSettings, eq(accountSettings.id, settingsId)),
      loadTableOrNull(appearanceSettings, eq(appearanceSettings.id, settingsId)),
      loadTableOrNull(operationalSettings, eq(operationalSettings.id, settingsId)),
      loadPaymentOrNull(),
      loadTableOrNull(systemSettings, eq(systemSettings.id, settingsId)),
      loadTableOrNull(receiptSettings, and(
        eq(receiptSettings.businessId, businessId || "00000000-0000-0000-0000-000000000001"),
        eq(receiptSettings.storeId, storeId || "00000000-0000-0000-0000-000000000002")
      )),
      db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, currency: businesses.currency, timezone: businesses.timezone, status: businesses.status }).from(businesses).where(eq(businesses.id, businessId || "00000000-0000-0000-0000-000000000001")).limit(1),
    ]);

    const isUninitialized = !profile && !operational && !payment;

    return NextResponse.json({
      profile: profile ?? {
        businessName: business[0]?.name ?? "",
        address: "",
        phone: "",
        email: "",
        logoUrl: null,
        description: null,
        website: null,
        socialMedia: null,
      },
      notifications: notifications ?? {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        orderEmail: true,
        orderSms: false,
        orderPush: true,
        lowStockEmail: true,
        lowStockSms: false,
        lowStockPush: true,
        paymentEmail: true,
        paymentSms: false,
        paymentPush: true,
        marketingEmail: false,
      },
      privacySecurity: privacySecurity ?? {
        dataRetentionDays: 365,
        sessionTimeoutMinutes: 480,
        requireTwoFactor: false,
        allowPasswordLogin: true,
        allowMagicLink: true,
        allowSocialLogin: true,
        auditLogEnabled: true,
      },
      account: account ?? {
        defaultUserRole: "cashier",
        maxUsers: 50,
        autoApproveUsers: false,
        requireEmailVerification: true,
      },
      appearance: appearance ?? {
        theme: "system",
        primaryColor: "#2563eb",
        fontFamily: "system",
        language: "id",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        compactMode: false,
      },
      operational: operational ?? {
        currency: business[0]?.currency ?? "IDR",
        timezone: business[0]?.timezone ?? "Asia/Jakarta",
        taxRate: "0",
        memberDiscountRate: "0",
        lowStockThreshold: 10,
        reservationExpiryMinutes: 30,
        autoCancelUnpaidOrders: true,
        allowSplitPayment: true,
      },
      payment: payment ?? {
        paymentGatewayModuleStatus: "NOT_INSTALLED",
        qrManualTransferEnabled: true,
        manualTransferBankName: "",
        manualTransferAccountName: "",
        manualTransferAccountNumber: "",
        manualTransferInstructions: "",
        manualTransferQrisImageUrl: null,
        acceptCash: true,
        acceptCard: false,
        acceptQris: false,
        acceptTransfer: true,
      },
      system: system ?? {
        maintenanceMode: false,
        maintenanceMessage: null,
        debugMode: false,
        apiRateLimit: 100,
        enableApiDocs: false,
        backupEnabled: true,
        backupFrequency: "daily",
      },
      receipt: { footer: receipt?.footer ?? "" },
      capabilities: {
        businessDescription: !!profile,
        businessWebsite: !!profile,
        businessLogo: !!profile,
        notificationChannels: !!notifications,
        sessionManagement: !!privacySecurity,
        accountEdit: true,
        paymentGateway: payment?.paymentGatewayModuleStatus === "INSTALLED" || payment?.paymentGatewayModuleStatus === "CONFIGURED",
      },
      settingsState: isUninitialized ? "uninitialized" : "ready",
    });
  } catch (e: any) {
    console.error("Settings GET error:", e);
    const msg = process.env.NODE_ENV === "production" ? "Gagal memuat pengaturan." : (e?.message || "Gagal memuat pengaturan.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSettingsAccess();
  if ((auth as any).error) return (auth as any).error;
  const body = await request.json().catch(() => null);
  const section = String(body?.section || "");
  const payload = body?.payload;
  const now = new Date();

  const { businessId } = await getTenantIds();
  if (!businessId) {
    return NextResponse.json({ error: "Konteks bisnis tidak ditemukan. Silakan muat ulang halaman." }, { status: 400 });
  }
  const settingsId = businessId;

  try {
    if (section === "profile") {
      const v = profileSchema.parse(payload);
      await db
        .insert(businessProfile)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: businessProfile.id, set: { ...v, updatedAt: now } });
      await db
        .update(businesses)
        .set({ name: v.businessName, updatedAt: now })
        .where(eq(businesses.id, businessId));
      return NextResponse.json({ ok: true, section });
    }
    if (section === "notifications") {
      const v = notificationSchema.parse(payload);
      await db
        .insert(notificationSettings)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: notificationSettings.id, set: { ...v, updatedAt: now } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "privacySecurity") {
      const v = privacySecuritySchema.parse(payload);
      await db
        .insert(privacySecuritySettings)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: privacySecuritySettings.id, set: { ...v, updatedAt: now } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "account") {
      const v = accountSchema.parse(payload);
      await db
        .insert(accountSettings)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: accountSettings.id, set: { ...v, updatedAt: now } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "appearance") {
      const v = appearanceSchema.parse(payload);
      await db
        .insert(appearanceSettings)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: appearanceSettings.id, set: { ...v, updatedAt: now } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "operational") {
      const v = operationalSchema.parse(payload);
      await db
        .insert(operationalSettings)
        .values({
          id: settingsId,
          businessId,
          currency: v.currency,
          timezone: v.timezone,
          taxRate: String(moneyPercentToRate(v.taxRatePercent)),
          memberDiscountRate: String(moneyPercentToRate(v.memberDiscountRatePercent)),
          lowStockThreshold: v.lowStockThreshold,
          reservationExpiryMinutes: v.reservationExpiryMinutes,
          autoCancelUnpaidOrders: v.autoCancelUnpaidOrders,
          allowSplitPayment: v.allowSplitPayment,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({ target: operationalSettings.id, set: {
          currency: v.currency,
          timezone: v.timezone,
          taxRate: String(moneyPercentToRate(v.taxRatePercent)),
          memberDiscountRate: String(moneyPercentToRate(v.memberDiscountRatePercent)),
          lowStockThreshold: v.lowStockThreshold,
          reservationExpiryMinutes: v.reservationExpiryMinutes,
          autoCancelUnpaidOrders: v.autoCancelUnpaidOrders,
          allowSplitPayment: v.allowSplitPayment,
          updatedAt: now,
        } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "payment") {
      const v = paymentSchema.parse(payload);
      const qris = (v.manualTransferQrisImageUrl || null) as string | null;
      const errText = (e: any) => [e?.message, e?.cause?.message, e?.query, e?.cause?.query, e?.cause?.detail, e?.detail, e?.cause?.hint].filter(Boolean).join("\n");
      const isMissingQrisColumn = (e: any) => {
        const t = errText(e);
        if (/ManualTransferQrisImageUrl/i.test(t) && (/does not exist|undefined column|42703/i.test(t) || String(e?.code ?? e?.cause?.code ?? "") === "42703")) return true;
        return String(e?.code ?? e?.cause?.code ?? "") === "42703" && !/ManualTransferQrisImageUrl/i.test(t) ? false : false;
      };
      const nowIso = now.toISOString();
      const savePaymentWithoutQris = async () => {
        await db.execute(sql`
          insert into "settings"."PaymentSettings" (
            "Id","BusinessId","PaymentGatewayModuleStatus","QrManualTransferEnabled",
            "ManualTransferBankName","ManualTransferAccountName","ManualTransferAccountNumber","ManualTransferInstructions",
            "AcceptCash","AcceptCard","AcceptQris","AcceptTransfer","UpdatedAt"
          ) values (
            ${settingsId}, ${businessId}::uuid, ${v.paymentGatewayModuleStatus}, ${v.qrManualTransferEnabled},
            ${v.manualTransferBankName || null}, ${v.manualTransferAccountName || null}, ${v.manualTransferAccountNumber || null}, ${v.manualTransferInstructions || null},
            ${v.acceptCash}, ${v.acceptCard}, ${v.acceptQris}, ${v.acceptTransfer}, ${nowIso}::timestamptz
          )
          on conflict ("Id") do update set
            "PaymentGatewayModuleStatus" = excluded."PaymentGatewayModuleStatus",
            "QrManualTransferEnabled" = excluded."QrManualTransferEnabled",
            "ManualTransferBankName" = excluded."ManualTransferBankName",
            "ManualTransferAccountName" = excluded."ManualTransferAccountName",
            "ManualTransferAccountNumber" = excluded."ManualTransferAccountNumber",
            "ManualTransferInstructions" = excluded."ManualTransferInstructions",
            "AcceptCash" = excluded."AcceptCash",
            "AcceptCard" = excluded."AcceptCard",
            "AcceptQris" = excluded."AcceptQris",
            "AcceptTransfer" = excluded."AcceptTransfer",
            "UpdatedAt" = excluded."UpdatedAt"
        `);
      };
      const savePaymentWithQris = async () => {
        await db.execute(sql`
          insert into "settings"."PaymentSettings" (
            "Id","BusinessId","PaymentGatewayModuleStatus","QrManualTransferEnabled",
            "ManualTransferBankName","ManualTransferAccountName","ManualTransferAccountNumber","ManualTransferInstructions",
            "ManualTransferQrisImageUrl","AcceptCash","AcceptCard","AcceptQris","AcceptTransfer","UpdatedAt"
          ) values (
            ${settingsId}, ${businessId}::uuid, ${v.paymentGatewayModuleStatus}, ${v.qrManualTransferEnabled},
            ${v.manualTransferBankName || null}, ${v.manualTransferAccountName || null}, ${v.manualTransferAccountNumber || null}, ${v.manualTransferInstructions || null},
            ${qris}, ${v.acceptCash}, ${v.acceptCard}, ${v.acceptQris}, ${v.acceptTransfer}, ${nowIso}::timestamptz
          )
          on conflict ("Id") do update set
            "PaymentGatewayModuleStatus" = excluded."PaymentGatewayModuleStatus",
            "QrManualTransferEnabled" = excluded."QrManualTransferEnabled",
            "ManualTransferBankName" = excluded."ManualTransferBankName",
            "ManualTransferAccountName" = excluded."ManualTransferAccountName",
            "ManualTransferAccountNumber" = excluded."ManualTransferAccountNumber",
            "ManualTransferInstructions" = excluded."ManualTransferInstructions",
            "ManualTransferQrisImageUrl" = excluded."ManualTransferQrisImageUrl",
            "AcceptCash" = excluded."AcceptCash",
            "AcceptCard" = excluded."AcceptCard",
            "AcceptQris" = excluded."AcceptQris",
            "AcceptTransfer" = excluded."AcceptTransfer",
            "UpdatedAt" = excluded."UpdatedAt"
        `);
      };
      try {
        await savePaymentWithQris();
      } catch (e: any) {
        if (isMissingQrisColumn(e)) {
          await savePaymentWithoutQris();
        } else {
          throw e;
        }
      }
      // Sync legacy BusinessSettings (global id='default') for storefront readers.
      try {
        const syncLegacyWithoutQris = async () => {
          await db.execute(sql`
            insert into "settings"."BusinessSettings" (
              "Id","BusinessId","BusinessName","QrManualTransferEnabled",
              "ManualTransferBankName","ManualTransferAccountName","ManualTransferAccountNumber","ManualTransferInstructions","UpdatedAt"
            ) values (
              'default', ${businessId}::uuid, '', ${v.qrManualTransferEnabled},
              ${v.manualTransferBankName || null}, ${v.manualTransferAccountName || null}, ${v.manualTransferAccountNumber || null}, ${v.manualTransferInstructions || null}, ${nowIso}::timestamptz
            )
            on conflict ("Id") do update set
              "QrManualTransferEnabled" = excluded."QrManualTransferEnabled",
              "ManualTransferBankName" = excluded."ManualTransferBankName",
              "ManualTransferAccountName" = excluded."ManualTransferAccountName",
              "ManualTransferAccountNumber" = excluded."ManualTransferAccountNumber",
              "ManualTransferInstructions" = excluded."ManualTransferInstructions",
              "UpdatedAt" = excluded."UpdatedAt"
          `);
        };
        const syncLegacyWithQris = async () => {
          await db.execute(sql`
            insert into "settings"."BusinessSettings" (
              "Id","BusinessId","BusinessName","QrManualTransferEnabled",
              "ManualTransferBankName","ManualTransferAccountName","ManualTransferAccountNumber","ManualTransferInstructions",
              "ManualTransferQrisImageUrl","UpdatedAt"
            ) values (
              'default', ${businessId}::uuid, '', ${v.qrManualTransferEnabled},
              ${v.manualTransferBankName || null}, ${v.manualTransferAccountName || null}, ${v.manualTransferAccountNumber || null}, ${v.manualTransferInstructions || null},
              ${qris}, ${nowIso}::timestamptz
            )
            on conflict ("Id") do update set
              "QrManualTransferEnabled" = excluded."QrManualTransferEnabled",
              "ManualTransferBankName" = excluded."ManualTransferBankName",
              "ManualTransferAccountName" = excluded."ManualTransferAccountName",
              "ManualTransferAccountNumber" = excluded."ManualTransferAccountNumber",
              "ManualTransferInstructions" = excluded."ManualTransferInstructions",
              "ManualTransferQrisImageUrl" = excluded."ManualTransferQrisImageUrl",
              "UpdatedAt" = excluded."UpdatedAt"
          `);
        };
        try {
          await syncLegacyWithQris();
        } catch (e: any) {
          if (isMissingQrisColumn(e)) await syncLegacyWithoutQris();
        }
      } catch {}
      return NextResponse.json({ ok: true, section });
    }
    if (section === "system") {
      const v = systemSchema.parse(payload);
      await db
        .insert(systemSettings)
        .values({ id: settingsId, businessId, ...v, updatedAt: now } as any)
        .onConflictDoUpdate({ target: systemSettings.id, set: { ...v, updatedAt: now } });
      return NextResponse.json({ ok: true, section });
    }
    if (section === "receipt") {
      const v = receiptSchema.parse(payload);
      const { storeId } = await getTenantIds();
      const receiptStoreId = storeId || "00000000-0000-0000-0000-000000000002";
      const [existing] = await db.select({ id: receiptSettings.id }).from(receiptSettings).where(and(eq(receiptSettings.businessId, businessId), eq(receiptSettings.storeId, receiptStoreId))).limit(1);
      if (existing) await db.update(receiptSettings).set({ footer: v.receiptFooter, updatedAt: now }).where(eq(receiptSettings.id, existing.id));
      else await db.insert(receiptSettings).values({ businessId, storeId: receiptStoreId, footer: v.receiptFooter, updatedAt: now } as any);
      return NextResponse.json({ ok: true, section });
    }
    return NextResponse.json({ error: "Bagian pengaturan tidak valid." }, { status: 400 });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.issues?.[0]?.message || "Data tidak valid." }, { status: 400 });
    const detail = [e?.cause?.message, e?.cause?.detail, e?.cause?.hint, e?.detail, e?.hint].filter(Boolean).join(" | ") || undefined;
    const msg = e?.message || "Gagal menyimpan pengaturan.";
    return NextResponse.json({ error: detail ? `${msg} — ${detail}` : msg }, { status: 500 });
  }
}