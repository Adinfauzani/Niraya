import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { getActiveBusinessIds } from "@/server/auth/BusinessContext";
import { db } from "@/server/db";
import { businesses, stores } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);
  const body = await request.json();
  const { businessId, storeId } = body;

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  // Verify user has access to this business
  const memberships = await getActiveBusinessIds(userId);
  if (!memberships.includes(businessId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Verify store belongs to business if provided
  let targetStoreId = storeId;
  if (storeId) {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.businessId, businessId), eq(stores.isActive, true)),
      columns: { id: true },
    });
    if (!store) {
      targetStoreId = undefined;
    }
  }
  if (!targetStoreId) {
    // Get first active store for the business
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.businessId, businessId), eq(stores.isActive, true)),
      columns: { id: true },
    });
    targetStoreId = store?.id;
  }

  // Set cookies (expires in 1 year)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };

  cookieStore.set("niraya_selected_business", businessId, cookieOptions);
  if (targetStoreId) {
    cookieStore.set("niraya_selected_store", targetStoreId, cookieOptions);
  }

  return NextResponse.json({ ok: true, businessId, storeId: targetStoreId });
}