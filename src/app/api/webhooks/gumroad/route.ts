import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { env } from "@/lib/env";
import { db } from "@/server/db";
import { webhookEvents } from "@/server/db/schema";
import {
  buildEventKey,
  parseGumroadPayload,
  processGumroadEvent,
} from "@/server/billing/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gumroad Ping / Resource Subscription endpoint.
 *
 * Gumroad tidak memberi signature HMAC yang bisa diandalkan, jadi:
 * - URL endpoint dijaga sebagai rahasia,
 * - seller_id diverifikasi bila tersedia,
 * - opsional: sale diverifikasi ulang lewat Gumroad API.
 */
async function verifyGumroadSale(
  saleId: string,
  productId: string | null
): Promise<boolean> {
  if (!env.GUMROAD_ACCESS_TOKEN) return false;

  try {
    const response = await fetch(
      `https://api.gumroad.com/v2/sales/${encodeURIComponent(saleId)}`,
      {
        headers: {
          Authorization: `Bearer ${env.GUMROAD_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );
    if (!response.ok) return false;

    const data = (await response.json()) as {
      success?: boolean;
      sale?: { seller_id?: string; product_id?: string };
    };
    if (!data?.success || !data.sale) return false;

    if (
      env.GUMROAD_SELLER_ID &&
      String(data.sale.seller_id ?? "") !== env.GUMROAD_SELLER_ID
    ) {
      return false;
    }
    if (productId && String(data.sale.product_id ?? "") !== productId) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!raw.trim()) {
    return NextResponse.json({ error: "Payload kosong." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = parseGumroadPayload(raw, request.headers.get("content-type"));
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const resource = String(payload.resource ?? payload.resource_name ?? "sale");
  const sellerId = payload.seller_id ? String(payload.seller_id) : null;
  const saleId = payload.sale_id ? String(payload.sale_id) : null;
  const productId = payload.product_id ? String(payload.product_id) : null;

  if (env.GUMROAD_SELLER_ID && sellerId && sellerId !== env.GUMROAD_SELLER_ID) {
    return NextResponse.json({ error: "Seller tidak cocok." }, { status: 401 });
  }

  if (
    env.GUMROAD_VERIFY_WEBHOOK === "true" &&
    resource === "sale" &&
    saleId
  ) {
    const verified = await verifyGumroadSale(saleId, productId);
    if (!verified) {
      return NextResponse.json(
        { error: "Sale tidak terverifikasi." },
        { status: 401 }
      );
    }
  }

  const eventKey = buildEventKey(resource, payload);

  let event: { id: string } | null = null;
  try {
    const [inserted] = await db
      .insert(webhookEvents)
      .values({
        provider: "gumroad",
        resource,
        eventKey,
        providerSubscriptionId: payload.subscription_id
          ? String(payload.subscription_id)
          : null,
        saleId,
        payload,
        status: "received",
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    event = inserted ?? null;
  } catch (error) {
    console.error("[gumroad-webhook] gagal menyimpan event", error);
    return NextResponse.json(
      { error: "Gagal menyimpan event." },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const result = await processGumroadEvent(resource, payload);

    await db
      .update(webhookEvents)
      .set({
        status: result.ignored ? "ignored" : "processed",
        error: result.ignored ? result.reason ?? null : null,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, event.id));

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses event.";

    await db
      .update(webhookEvents)
      .set({
        status: "failed",
        error: message,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, event.id))
      .catch(() => undefined);

    console.error("[gumroad-webhook] gagal memproses event", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
