import crypto from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  DEFAULT_BUSINESS_ID,
  DEFAULT_STORE_ID,
  checkoutIdempotency,
  inventory,
  inventoryReservations,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  products,
  productVariants,
  taxRates,
} from "@/server/db/schema";
import { createGuestAccessInTx } from "@/server/storefront/guest-access";

export type StorefrontCheckoutInput = {
  idempotencyKey: string;
  items: { productId: string; variantId?: string | null; quantity: number; notes?: string }[];
  paymentMethod: "manual_transfer";
  orderType?: "dine-in" | "takeaway";
  notes?: string;
  customer: { mode: "guest" | "authenticated"; name: string; phone: string; email?: string | null; authUserId?: string | null };
};

function roundMoney(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }
function generateOrderNumber() {
  const d = new Date(); const y = d.getFullYear().toString().slice(-2); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0");
  return `WB-${y}${m}${day}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
}
export function hashStorefrontRequest(input: StorefrontCheckoutInput) {
  const items = [...input.items].sort((a,b)=> (a.productId+(a.variantId||'')).localeCompare(b.productId+(b.variantId||'')));
  return crypto.createHash("sha256").update(JSON.stringify({
    source: "STOREFRONT", items, paymentMethod: input.paymentMethod, orderType: input.orderType,
    notes: input.notes, customer: { mode: input.customer.mode, name: input.customer.name, phone: input.customer.phone, email: input.customer.email ?? null },
  })).digest("hex");
}

async function loadCheckoutSettings(tx: any) {
  try {
    const rows = await tx.execute(sql`select "QrManualTransferEnabled" as manual, "TaxRate" as tax_rate, "ReservationExpiryMinutes" as expiry, "ManualTransferBankName" as bank, "ManualTransferAccountName" as acc_name, "ManualTransferAccountNumber" as acc_no, "ManualTransferInstructions" as instructions from "settings"."BusinessSettings" where "Id" = 'default' limit 1`);
    const r = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
    if (r) return { manualTransferEnabled: !!r.manual, taxRate: r.tax_rate != null ? Number(r.tax_rate) : null, expiryMinutes: r.expiry != null ? Number(r.expiry) : 30, instructions: { bankName: r.bank ?? null, accountName: r.acc_name ?? null, accountNumber: r.acc_no ?? null, instructions: r.instructions ?? null } };
  } catch {}
  return { manualTransferEnabled: false, taxRate: null, expiryMinutes: 30, instructions: { bankName: null, accountName: null, accountNumber: null, instructions: null } };
}

/** Direct public storefront checkout. No QR token, no dining table context. DiningTableId always NULL.
 *  DB orderSource stored as QR_GENERAL for current CHECK constraint compatibility; public responses report STOREFRONT.
 *  Authenticated ownership is recorded via orderStatusHistory.changedByUserId (Neon auth user id), not orders.customerId,
 *  because orders.customerId references customers.Customers.id and no auth->customer mapping exists. */
export async function executeStorefrontCheckout(input: StorefrontCheckoutInput) {
  if (input.paymentMethod !== "manual_transfer") throw Object.assign(new Error("Metode pembayaran tidak didukung."), { status: 400 });
  if (!input.customer.name?.trim() || !input.customer.phone?.trim()) throw Object.assign(new Error("Nama dan nomor telepon wajib diisi."), { status: 400 });
  if (input.customer.mode === "authenticated" && !input.customer.authUserId) throw Object.assign(new Error("Sesi pelanggan tidak valid."), { status: 401 });
  const requestHash = hashStorefrontRequest(input);
  const canonicalItems = [...input.items].sort((a,b)=> (a.productId+(a.variantId||'')).localeCompare(b.productId+(b.variantId||'')));
  const productIds = [...new Set(canonicalItems.map(i=>i.productId))].sort();

  return db.transaction(async (tx: any) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`storefront:${input.idempotencyKey}`}))`);
    const [existing] = await tx.select().from(checkoutIdempotency).where(eq(checkoutIdempotency.key, input.idempotencyKey)).limit(1);
    if (existing) {
      if (existing.requestHash !== requestHash) throw Object.assign(new Error("Idempotency key dipakai dengan payload berbeda."), { status: 409 });
      if (existing.response) return { ...(JSON.parse(existing.response) as any), idempotent: true };
    }
    const settings = await loadCheckoutSettings(tx);
    if (!settings.manualTransferEnabled) throw Object.assign(new Error("Pembayaran transfer manual belum diaktifkan."), { status: 403 });

    const productRows = await tx.select().from(products).where(inArray(products.id, productIds)).orderBy(products.id).for("update");
    const invRows = await tx.select().from(inventory).where(and(eq(inventory.storeId, DEFAULT_STORE_ID), inArray(inventory.productId, productIds))).orderBy(inventory.productId).for("update");
    const varIds = canonicalItems.map(i=>i.variantId).filter(Boolean) as string[];
    const varRows = varIds.length ? await tx.select().from(productVariants).where(inArray(productVariants.id, varIds)) : [];
    const pBy = new Map(productRows.map((r:any)=>[r.id,r])); const iBy = new Map(invRows.map((r:any)=>[r.productId,r])); const vBy = new Map(varRows.map((r:any)=>[r.id,r]));
    const [defaultTaxRate] = await tx.select().from(taxRates).where(and(eq(taxRates.businessId,DEFAULT_BUSINESS_ID), eq(taxRates.isDefault,true))).limit(1);
    const taxRate = settings.taxRate != null ? settings.taxRate : Number(defaultTaxRate?.rate ?? 0);

    let subtotal = 0; const items: any[] = [];
    for (const it of canonicalItems) {
      const p = pBy.get(it.productId) as any; if (!p) throw Object.assign(new Error(`Produk ${it.productId} tidak ditemukan.`),{status:400});
      if (p.status !== "active") throw Object.assign(new Error(`Produk ${p.name} tidak tersedia.`),{status:400});
      if (it.variantId) { const v=vBy.get(it.variantId) as any; if (!v || v.productId!==p.id || !v.isActive) throw Object.assign(new Error(`Varian tidak valid.`),{status:400}); }
      const inv = iBy.get(it.productId) as any; const onHand = inv?.stockQuantity ?? p.stockQuantity ?? 0; const reserved = inv?.reservedQuantity ?? 0; const available = Math.max(0, onHand - reserved);
      if ((p.isStockTracked ?? true) && available < it.quantity) throw Object.assign(new Error(`Stok ${p.name} tidak cukup.`),{status:409});
      const variant = it.variantId ? vBy.get(it.variantId) as any : null;
      const unit = Number(variant?.sellingPrice ?? p.sellingPrice); const line = roundMoney(unit * it.quantity); subtotal += line;
      items.push({ productId:p.id, variantId: it.variantId||null, productName:p.name, sku:p.sku, variantName: variant?.name??null, quantity:it.quantity, unitPrice:unit, lineTotal:line, notes: it.notes||null, product:p, inv });
    }
    subtotal = roundMoney(subtotal); const tax = roundMoney(subtotal * taxRate); const total = roundMoney(subtotal + tax);
    const now = new Date(); const expiryMin = Math.max(5, settings.expiryMinutes || 30);
    const expiresAt = new Date(now.getTime() + expiryMin*60000);
    const orderId = crypto.randomUUID(); const orderNumber = generateOrderNumber();
    const paymentId = crypto.randomUUID();
    const orderSource = "QR_GENERAL"; // DB CHECK compat; DiningTableId NULL => storefront
    const authUserId = input.customer.mode === "authenticated" ? String(input.customer.authUserId) : null;
    await tx.insert(orders).values({
      id: orderId, businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, orderNumber, orderSource, orderStatus: "SUBMITTED", paymentStatus: "PENDING",
      diningTableId: null, customerId: null, // FK points to customers.Customers.id; auth ownership tracked in orderStatusHistory
      customerName: input.customer.name.trim(), customerPhone: input.customer.phone.trim(), orderType: input.orderType || "takeaway",
      tableNumber: null, paymentMethod: "manual_transfer", currency:"IDR", subtotal: subtotal.toFixed(2), discountTotal:"0.00", taxTotal: tax.toFixed(2), grandTotal: total.toFixed(2),
      idempotencyKey: input.idempotencyKey, notes: input.notes||null, submittedAt: now, createdAt: now, updatedAt: now,
    } as any);
    for (const it of items) {
      const orderItemId = crypto.randomUUID();
      await tx.insert(orderItems).values({ id: orderItemId, orderId, productId: it.productId, productVariantId: it.variantId, productName: it.productName, sku: it.sku, variantName: it.variantName, quantity: it.quantity, unitPrice: it.unitPrice.toFixed(2), discountTotal:"0.00", taxTotal:"0.00", subtotal: it.lineTotal.toFixed(2), notes: it.notes, createdAt: now } as any);
      if (it.product.isStockTracked ?? true) {
        await tx.insert(inventoryReservations).values({ id: crypto.randomUUID(), businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, orderId, orderItemId, productId: it.productId, quantity: it.quantity, status: "RESERVED", expiresAt, createdAt: now, updatedAt: now } as any);
        const inv = it.inv; const nextReserved = (inv?.reservedQuantity ?? 0) + it.quantity;
        if (inv) await tx.update(inventory).set({ reservedQuantity: nextReserved, updatedAt: now }).where(eq(inventory.id, inv.id));
        else await tx.insert(inventory).values({ businessId: DEFAULT_BUSINESS_ID, storeId: DEFAULT_STORE_ID, productId: it.productId, stockQuantity: it.product.stockQuantity ?? 0, reservedQuantity: nextReserved, minimumStock: it.product.minimumStock ?? 0, updatedAt: now } as any);
      }
    }
    await tx.insert(payments).values({ id: paymentId, transactionId: null, orderId, channel: "STOREFRONT", currency:"IDR", paymentMethod:"manual_transfer", amount: total.toFixed(2), status:"PENDING", expiresAt, metadata: { source: "STOREFRONT" }, createdAt: now } as any);
    await tx.insert(orderStatusHistory).values({ orderId, fromOrderStatus:null, toOrderStatus:"SUBMITTED", fromPaymentStatus:null, toPaymentStatus:"PENDING", changedByUserId: authUserId, changedByRole: authUserId ? "customer" : "guest", reason:"Storefront checkout submitted; awaiting manual transfer", createdAt: now } as any);
    const response: any = {
      orderId, orderNumber, orderSource: "STOREFRONT", orderStatus:"SUBMITTED", paymentStatus:"PENDING", paymentId,
      customer: { mode: input.customer.mode, name: input.customer.name.trim(), phone: input.customer.phone.trim() },
      items: items.map((i:any)=>({productId:i.productId,productName:i.productName,variantName:i.variantName,quantity:i.quantity,unitPrice:i.unitPrice,lineTotal:i.lineTotal})),
      totals: { subtotal, tax, total, currency:"IDR" }, reservation: { expiresAt: expiresAt.toISOString() },
      payment: { method:"manual_transfer", status:"PENDING", instructions: settings.instructions },
    };
    let guestAccess: { rawToken: string; expiresAt: Date } | null = null;
    if (input.customer.mode === "guest") {
      guestAccess = await createGuestAccessInTx(tx, orderId);
      response.guestAccess = { expiresAt: guestAccess.expiresAt.toISOString(), delivery: "cookie+response-once" };
    }
    await tx.insert(checkoutIdempotency).values({ key: input.idempotencyKey, requestHash, transactionId: null, orderId, scope:"STOREFRONT", response: JSON.stringify(response), createdAt: now, expiresAt } as any)
      .onConflictDoUpdate({ target: checkoutIdempotency.key, set: { orderId, scope:"STOREFRONT", response: JSON.stringify(response) } as any });
    if (guestAccess) response._guestAccessRaw = guestAccess.rawToken;
    return response;
  });
}
