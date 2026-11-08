import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, businessSettings, DEFAULT_BUSINESS_ID, DEFAULT_STORE_ID, receiptSettings } from "@/server/db/schema";
import { ACTION_ROLES, ensureUserProfile, requireRole } from "@/server/auth/session";

function moneyPercentToRate(v: unknown, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n / 100));
}

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(1000).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.string().trim().email().max(160).or(z.literal("")).default(""),
});

const operationalSchema = z.object({
  currency: z.literal("IDR").default("IDR"),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).default("Asia/Jakarta"),
  taxRatePercent: z.number().min(0).max(100),
  memberDiscountRatePercent: z.number().min(0).max(100),
  lowStockThreshold: z.number().int().min(0).max(100000),
  reservationExpiryMinutes: z.number().int().min(5).max(1440),
});

const paymentSchema = z.object({
  qrManualTransferEnabled: z.boolean(),
  manualTransferBankName: z.string().trim().max(120).default(""),
  manualTransferAccountName: z.string().trim().max(120).default(""),
  manualTransferAccountNumber: z.string().trim().max(120).default(""),
  manualTransferInstructions: z.string().trim().max(1000).default(""),
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

async function loadSettingsRow() {
  try {
    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, "default")).limit(1);
    return settings ?? null;
  } catch (error: any) {
    // Schema drift fallback (e.g. DB missing deprecated/new columns that are still in Drizzle schema)
    if (error?.code !== "42703" && error?.cause?.code !== "42703") throw error;
    const full = await db.execute(sql`
      select "Id", "BusinessId", "BusinessName", "Address", "Phone", "Email", "Currency", "Timezone",
             "TaxRate", "MemberDiscountRate", "LowStockThreshold", "LegacyReceiptFooter",
             "QrOrderingEnabled", "QrManualTransferEnabled", "ManualTransferBankName",
             "ManualTransferAccountName", "ManualTransferAccountNumber", "ManualTransferInstructions",
             "ReservationExpiryMinutes", "PaymentGatewayModuleStatus", "CreatedAt", "UpdatedAt"
      from "settings"."BusinessSettings" where "Id" = 'default' limit 1
    `).catch(() => null);
    let row = (full as any)?.rows?.[0] ?? (Array.isArray(full) ? full[0] : null);
    if (!row) {
      const min = await db.execute(sql`
        select "Id", "BusinessId", "BusinessName", "Address", "Phone", "Email", "Currency", "Timezone",
               "TaxRate", "MemberDiscountRate", "LowStockThreshold", "LegacyReceiptFooter"
        from "settings"."BusinessSettings" where "Id" = 'default' limit 1
      `);
      row = (min as any)?.rows?.[0] ?? (Array.isArray(min) ? min[0] : null) ?? null;
    }
    if (!row) return null;
    return {
      id: row.Id ?? row.id,
      businessId: row.BusinessId ?? row.businessId,
      businessName: row.BusinessName ?? row.businessName,
      address: row.Address ?? row.address ?? "",
      phone: row.Phone ?? row.phone ?? "",
      email: row.Email ?? row.email ?? "",
      currency: row.Currency ?? row.currency ?? "IDR",
      timezone: row.Timezone ?? row.timezone ?? "Asia/Jakarta",
      taxRate: row.TaxRate ?? row.taxRate ?? "0",
      memberDiscountRate: row.MemberDiscountRate ?? row.memberDiscountRate ?? "0",
      lowStockThreshold: Number(row.LowStockThreshold ?? row.lowStockThreshold ?? 0),
      legacyReceiptFooter: row.LegacyReceiptFooter ?? row.legacyReceiptFooter ?? "",
      qrOrderingEnabled: !!(row.QrOrderingEnabled ?? row.qrOrderingEnabled ?? false),
      qrManualTransferEnabled: !!(row.QrManualTransferEnabled ?? row.qrManualTransferEnabled ?? false),
      manualTransferBankName: row.ManualTransferBankName ?? row.manualTransferBankName ?? null,
      manualTransferAccountName: row.ManualTransferAccountName ?? row.manualTransferAccountName ?? null,
      manualTransferAccountNumber: row.ManualTransferAccountNumber ?? row.manualTransferAccountNumber ?? null,
      manualTransferInstructions: row.ManualTransferInstructions ?? row.manualTransferInstructions ?? null,
      reservationExpiryMinutes: Number(row.ReservationExpiryMinutes ?? row.reservationExpiryMinutes ?? 30),
      paymentGatewayModuleStatus: row.PaymentGatewayModuleStatus ?? row.paymentGatewayModuleStatus ?? "NOT_INSTALLED",
    } as any;
  }
}

export async function GET() {
  try {
    const auth = await requireSettingsAccess();
    if ((auth as any).error) return (auth as any).error;
    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, "default")).limit(1);
    const [receipt] = await db.select().from(receiptSettings).where(and(eq(receiptSettings.businessId, DEFAULT_BUSINESS_ID), eq(receiptSettings.storeId, DEFAULT_STORE_ID))).limit(1);
    const [business] = await db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, currency: businesses.currency, timezone: businesses.timezone, status: businesses.status }).from(businesses).where(eq(businesses.id, DEFAULT_BUSINESS_ID)).limit(1);
    if (!settings) {
      return NextResponse.json({
        business: {
          id: business?.id ?? DEFAULT_BUSINESS_ID,
          name: business?.name ?? "",
          address: "",
          phone: "",
          email: "",
          currency: business?.currency ?? "IDR",
          timezone: business?.timezone ?? "Asia/Jakarta",
          status: business?.status ?? "active",
        },
        operational: {
          taxRatePercent: 0,
          memberDiscountRatePercent: 0,
          lowStockThreshold: 0,
          reservationExpiryMinutes: 30,
        },
        payment: {
          qrManualTransferEnabled: false,
          manualTransferBankName: "",
          manualTransferAccountName: "",
          manualTransferAccountNumber: "",
          manualTransferInstructions: "",
          paymentGatewayModuleStatus: "NOT_INSTALLED",
        },
        receipt: { footer: "" },
        capabilities: {
          businessDescription: false, businessWebsite: false, businessLogo: false,
          notificationChannels: false, sessionManagement: false, neonAccountEdit: true,
          paymentGateway: false,
        },
        settingsState: "uninitialized",
      });
    }
    return NextResponse.json({
      business: {
        id: business?.id ?? DEFAULT_BUSINESS_ID,
        name: settings.businessName,
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        currency: settings.currency,
        timezone: settings.timezone,
        status: business?.status ?? "active",
      },
      operational: {
        taxRatePercent: Number(settings.taxRate) * 100,
        memberDiscountRatePercent: Number(settings.memberDiscountRate) * 100,
        lowStockThreshold: settings.lowStockThreshold,
        reservationExpiryMinutes: settings.reservationExpiryMinutes,
      },
      payment: {
        qrManualTransferEnabled: !!settings.qrManualTransferEnabled,
        manualTransferBankName: settings.manualTransferBankName || "",
        manualTransferAccountName: settings.manualTransferAccountName || "",
        manualTransferAccountNumber: settings.manualTransferAccountNumber || "",
        manualTransferInstructions: settings.manualTransferInstructions || "",
        paymentGatewayModuleStatus: settings.paymentGatewayModuleStatus || "NOT_INSTALLED",
      },
      receipt: { footer: receipt?.footer ?? settings.legacyReceiptFooter ?? "" },
      capabilities: {
        businessDescription: false, businessWebsite: false, businessLogo: false,
        notificationChannels: false, sessionManagement: false, neonAccountEdit: true,
        paymentGateway: settings.paymentGatewayModuleStatus === "INSTALLED",
      },
      settingsState: "ready",
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

  try {
    if (section === "business") {
      const v = businessProfileSchema.parse(payload);
      await db.update(businessSettings).set({ businessName: v.businessName, address: v.address, phone: v.phone, email: v.email, updatedAt: now }).where(eq(businessSettings.id, "default"));
      return NextResponse.json({ ok: true, section });
    }
    if (section === "operational") {
      const v = operationalSchema.parse(payload);
      await db.update(businessSettings).set({ currency: v.currency, timezone: v.timezone, taxRate: String(moneyPercentToRate(v.taxRatePercent)), memberDiscountRate: String(moneyPercentToRate(v.memberDiscountRatePercent)), lowStockThreshold: v.lowStockThreshold, reservationExpiryMinutes: v.reservationExpiryMinutes, updatedAt: now }).where(eq(businessSettings.id, "default"));
      return NextResponse.json({ ok: true, section });
    }
    if (section === "payment") {
      const v = paymentSchema.parse(payload);
      await db.update(businessSettings).set({ qrManualTransferEnabled: v.qrManualTransferEnabled, manualTransferBankName: v.manualTransferBankName || null, manualTransferAccountName: v.manualTransferAccountName || null, manualTransferAccountNumber: v.manualTransferAccountNumber || null, manualTransferInstructions: v.manualTransferInstructions || null, updatedAt: now }).where(eq(businessSettings.id, "default"));
      return NextResponse.json({ ok: true, section });
    }
    if (section === "receipt") {
      const v = receiptSchema.parse(payload);
      const [existing] = await db.select({ id: receiptSettings.id }).from(receiptSettings).where(and(eq(receiptSettings.businessId, DEFAULT_BUSINESS_ID), eq(receiptSettings.storeId, DEFAULT_STORE_ID))).limit(1);
      if (existing) await db.update(receiptSettings).set({ footer: v.receiptFooter, updatedAt: now }).where(eq(receiptSettings.id, existing.id));
      else await db.insert(receiptSettings).values({ businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, footer: v.receiptFooter, updatedAt: now } as any);
      await db.update(businessSettings).set({ legacyReceiptFooter: v.receiptFooter, updatedAt: now }).where(eq(businessSettings.id, "default"));
      return NextResponse.json({ ok: true, section });
    }
    return NextResponse.json({ error: "Bagian pengaturan tidak valid." }, { status: 400 });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.issues?.[0]?.message || "Data tidak valid." }, { status: 400 });
    return NextResponse.json({ error: e?.message || "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
