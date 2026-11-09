import crypto from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { subscriptions, webhookEvents } from "@/server/db/schema";
import { resolvePlanForProduct } from "./plans";

type GumroadPayload = Record<string, unknown>;

export type ProcessResult = {
  ok?: boolean;
  ignored?: boolean;
  reason?: string;
  subscriptionId?: string;
  planId?: string;
};

export function parseGumroadPayload(
  raw: string,
  contentType: string | null
): GumroadPayload {
  if (contentType?.includes("application/json")) {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  const params = new URLSearchParams(raw);
  const payload: GumroadPayload = {};
  for (const [key, value] of params) payload[key] = value;
  return payload;
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return String(value).toLowerCase() === "true";
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function readObject(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortValue((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

/**
 * Kunci idempotensi stabil. Gumroad bisa retry; event yang sama harus
 * menghasilkan kunci yang sama.
 */
export function buildEventKey(
  resource: string,
  payload: GumroadPayload
): string {
  const saleId = asString(payload.sale_id);
  const subscriptionId = asString(payload.subscription_id);

  switch (resource) {
    case "sale":
      if (saleId) return `sale:${saleId}`;
      break;
    case "cancellation": {
      const at =
        asString(payload.cancelled_at) ?? asString(payload.effective_as_of);
      if (subscriptionId && at) return `cancellation:${subscriptionId}:${at}`;
      break;
    }
    case "subscription_ended": {
      const at = asString(payload.ended_at);
      if (subscriptionId && at)
        return `subscription_ended:${subscriptionId}:${at}`;
      break;
    }
    case "subscription_restarted": {
      const at =
        asString(payload.restarted_at) ??
        asString(payload.effective_as_of) ??
        asString(payload.updated_at);
      if (subscriptionId && at)
        return `subscription_restarted:${subscriptionId}:${at}`;
      break;
    }
    case "subscription_updated": {
      const at =
        asString(payload.effective_as_of) ?? asString(payload.updated_at);
      if (subscriptionId && at)
        return `subscription_updated:${subscriptionId}:${at}`;
      break;
    }
    case "refund": {
      const at = asString(payload.refunded_at);
      if (saleId && at) return `refund:${saleId}:${at}`;
      break;
    }
    case "dispute": {
      const id = asString(payload.dispute_id);
      if (id) return `dispute:${id}`;
      break;
    }
    case "dispute_won": {
      const id = asString(payload.dispute_id);
      if (id) return `dispute_won:${id}`;
      break;
    }
  }

  return `${resource}:${hash(JSON.stringify(sortValue(payload)))}`;
}

async function findSubscription(subscriptionId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, "gumroad"),
        eq(subscriptions.providerSubscriptionId, subscriptionId)
      )
    )
    .limit(1);
  return row ?? null;
}

async function findSubscriptionBySaleId(saleId: string) {
  const [event] = await db
    .select({ subscriptionId: webhookEvents.providerSubscriptionId })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, "gumroad"),
        eq(webhookEvents.saleId, saleId)
      )
    )
    .limit(1);
  return event?.subscriptionId
    ? await findSubscription(event.subscriptionId)
    : null;
}

async function handleSale(payload: GumroadPayload): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  if (!subscriptionId) {
    return { ignored: true, reason: "bukan penjualan membership" };
  }

  const productId =
    asString(payload.product_id) ?? asString(payload.product_permalink);
  const plan = await resolvePlanForProduct(productId);
  if (!plan) {
    return {
      ignored: true,
      reason: `product_id belum dipetakan: ${productId ?? "(kosong)"}`,
    };
  }

  const rawEmail =
    asString(payload.user_email) ??
    asString(payload.email) ??
    asString(payload.purchaser_email);
  if (!rawEmail) {
    return { ignored: true, reason: "email pembeli tidak ada" };
  }
  const email = rawEmail.trim().toLowerCase();

  const now = new Date();
  const saleAt =
    asDate(payload.sale_timestamp) ??
    asDate(payload.created_at) ??
    now;
  const currentPeriodEnd = addMonths(saleAt, plan.intervalMonths);
  const endedAt = asDate(payload.ended_at);
  const cancelled = asBoolean(payload.cancelled);
  const status = endedAt ? "ended" : cancelled ? "cancel_at_period_end" : "active";
  const recurrence = asString(payload.recurrence) ?? plan.recurrence;
  const quantity = Math.max(1, asNumber(payload.quantity, 1));

  const existing = await findSubscription(subscriptionId);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        planId: plan.id,
        purchaserEmail: email,
        providerUserId:
          asString(payload.user_id) ?? existing.providerUserId,
        status,
        recurrence,
        quantity,
        currentPeriodEnd,
        endedAt: endedAt ?? existing.endedAt,
        lastEventAt: now,
        raw: payload,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      businessId: null,
      provider: "gumroad",
      providerSubscriptionId: subscriptionId,
      providerUserId: asString(payload.user_id),
      purchaserEmail: email,
      planId: plan.id,
      status,
      recurrence,
      quantity,
      startedAt: saleAt,
      currentPeriodEnd,
      endedAt,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    });
  }

  return { ok: true, subscriptionId, planId: plan.id };
}

async function handleCancellation(
  payload: GumroadPayload
): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  if (!subscriptionId) {
    return { ignored: true, reason: "subscription_id tidak ada" };
  }

  const existing = await findSubscription(subscriptionId);
  if (!existing) {
    return { ignored: true, reason: `langganan tidak ditemukan: ${subscriptionId}` };
  }

  const now = new Date();
  const cancelAt =
    asDate(payload.effective_as_of) ??
    existing.currentPeriodEnd ??
    asDate(payload.cancelled_at);

  await db
    .update(subscriptions)
    .set({
      status: "cancel_at_period_end",
      cancelAt,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId };
}

async function handleSubscriptionEnded(
  payload: GumroadPayload
): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  if (!subscriptionId) {
    return { ignored: true, reason: "subscription_id tidak ada" };
  }

  const existing = await findSubscription(subscriptionId);
  if (!existing) {
    return { ignored: true, reason: `langganan tidak ditemukan: ${subscriptionId}` };
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: "ended",
      endedAt: asDate(payload.ended_at) ?? now,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId };
}

async function handleSubscriptionRestarted(
  payload: GumroadPayload
): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  if (!subscriptionId) {
    return { ignored: true, reason: "subscription_id tidak ada" };
  }

  const existing = await findSubscription(subscriptionId);
  if (!existing) {
    return { ignored: true, reason: `langganan tidak ditemukan: ${subscriptionId}` };
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: "active",
      cancelAt: null,
      endedAt: null,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId };
}

async function handleSubscriptionUpdated(
  payload: GumroadPayload
): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  if (!subscriptionId) {
    return { ignored: true, reason: "subscription_id tidak ada" };
  }

  const existing = await findSubscription(subscriptionId);
  if (!existing) {
    return { ignored: true, reason: `langganan tidak ditemukan: ${subscriptionId}` };
  }

  const newPlan = readObject(payload.new_plan);
  const newProductId =
    asString(newPlan?.product_id) ?? asString(payload.product_id);
  const plan = await resolvePlanForProduct(newProductId);
  const recurrence =
    asString(newPlan?.recurrence) ?? asString(payload.recurrence);
  const quantity = asOptionalNumber(newPlan?.quantity);
  const now = new Date();

  await db
    .update(subscriptions)
    .set({
      planId: plan?.id ?? existing.planId,
      recurrence: recurrence ?? existing.recurrence,
      quantity:
        quantity !== null && quantity > 0
          ? Math.round(quantity)
          : existing.quantity,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId, planId: plan?.id };
}

async function handleRefund(payload: GumroadPayload): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  const saleId = asString(payload.sale_id);
  const existing = subscriptionId
    ? await findSubscription(subscriptionId)
    : saleId
      ? await findSubscriptionBySaleId(saleId)
      : null;

  if (!existing) {
    return {
      ignored: true,
      reason: `langganan tidak ditemukan untuk refund ${saleId ?? ""}`,
    };
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: "refunded",
      endedAt: asDate(payload.refunded_at) ?? now,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId: existing.providerSubscriptionId };
}

async function handleDispute(
  payload: GumroadPayload,
  won: boolean
): Promise<ProcessResult> {
  const subscriptionId = asString(payload.subscription_id);
  const saleId = asString(payload.sale_id);
  const existing = subscriptionId
    ? await findSubscription(subscriptionId)
    : saleId
      ? await findSubscriptionBySaleId(saleId)
      : null;

  if (!existing) {
    return {
      ignored: true,
      reason: `langganan tidak ditemukan untuk dispute ${saleId ?? ""}`,
    };
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: won ? "active" : "disputed",
      endedAt: won ? null : existing.endedAt,
      lastEventAt: now,
      raw: payload,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, existing.id));

  return { ok: true, subscriptionId: existing.providerSubscriptionId };
}

export async function processGumroadEvent(
  resource: string,
  payload: GumroadPayload
): Promise<ProcessResult> {
  switch (resource) {
    case "sale":
      return handleSale(payload);
    case "cancellation":
      return handleCancellation(payload);
    case "subscription_ended":
      return handleSubscriptionEnded(payload);
    case "subscription_restarted":
      return handleSubscriptionRestarted(payload);
    case "subscription_updated":
      return handleSubscriptionUpdated(payload);
    case "refund":
      return handleRefund(payload);
    case "dispute":
      return handleDispute(payload, false);
    case "dispute_won":
      return handleDispute(payload, true);
    default:
      return { ignored: true, reason: `resource tidak dikenal: ${resource}` };
  }
}
