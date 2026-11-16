import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { webhookEvents, subscriptions } from "@/server/db/schema";
import crypto from "crypto";

export const runtime = "nodejs";

const GUMROAD_WEBHOOK_SECRET = process.env.GUMROAD_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string | null): boolean {
  if (!GUMROAD_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", GUMROAD_WEBHOOK_SECRET).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function createEventKey(resource: string, payload: Record<string, unknown>): string {
  const id = payload.subscription_id ?? payload.sale_id ?? payload.id ?? "unknown";
  return `${resource}:${id}`;
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const signature = headerStore.get("x-gumroad-signature") ?? headerStore.get("gumroad-signature");
  const body = await request.text();

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resource = String(payload.resource ?? "");
  const eventKey = createEventKey(resource, payload);
  const providerSubscriptionId = payload.subscription_id ? String(payload.subscription_id) : null;

  // Idempotency: check if already processed
  const [existing] = await db
    .select()
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, "gumroad"),
        eq(webhookEvents.eventKey, eventKey)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "processed") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    // Allow reprocessing of failed/ignored
  }

  // Store webhook event
  await db
    .insert(webhookEvents)
    .values({
      provider: "gumroad",
      resource,
      eventKey,
      providerSubscriptionId,
      saleId: payload.sale_id ? String(payload.sale_id) : null,
      payload,
      status: "received",
    })
    .onConflictDoUpdate({
      target: [webhookEvents.provider, webhookEvents.eventKey],
      set: {
        payload,
        status: "received",
        error: null,
        receivedAt: new Date(),
        processedAt: null,
      },
    });

  return NextResponse.json({ ok: true });
}