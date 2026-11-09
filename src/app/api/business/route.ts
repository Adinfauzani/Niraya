import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { businesses, stores } from "@/server/db/schema";
import { getSession } from "@/lib/auth";
import { getBusinessData, mutateBusiness } from "@/server/business/service";
import {
  ensureUserProfile,
  requireRole,
  ACTION_ROLES,
} from "@/server/auth/session";
import { createSeedData } from "@/lib/business-seed";
import { getBusinessContext, getActiveBusinessIds } from "@/server/auth/business-context";

async function requireSession() {
  const cookieStore = await cookies();
  const demo = cookieStore.get("niraya_demo")?.value;
  if (demo === "1") {
    return { id: "demo-user" } as any;
  }
  
  const session = await getSession();
  const user =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (user?.id) await ensureUserProfile(user);

  return user;
}

async function requireBusinessContext() {
  const cookieStore = await cookies();
  const demo = cookieStore.get("niraya_demo")?.value;
  if (demo === "1") {
    return { businessId: "00000000-0000-0000-0000-000000000001", storeId: "00000000-0000-0000-0000-000000000002" };
  }
  
  // Check for selected business/store cookies
  const selectedBusinessId = cookieStore.get("niraya_selected_business")?.value;
  const selectedStoreId = cookieStore.get("niraya_selected_store")?.value;
  
  const session = await getSession();
  const user =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  // If user has selected a specific business, verify they have access to it
  if (selectedBusinessId) {
    const memberships = await getActiveBusinessIds(user.id);
    if (memberships.includes(selectedBusinessId)) {
      // Verify store belongs to business if store is specified
      let storeId = selectedStoreId;
      if (storeId) {
        const store = await db.query.stores.findFirst({
          where: and(eq(stores.id, storeId), eq(stores.businessId, selectedBusinessId), eq(stores.isActive, true)),
          columns: { id: true },
        });
        if (!store) {
          storeId = undefined;
        }
      }
      if (!storeId) {
        // Get first active store for the business
        const store = await db.query.stores.findFirst({
          where: and(eq(stores.businessId, selectedBusinessId), eq(stores.isActive, true)),
          columns: { id: true },
        });
        storeId = store?.id ?? "00000000-0000-0000-0000-000000000002";
      }
      return { businessId: selectedBusinessId, storeId };
    }
  }

  const context = await getBusinessContext(user.id);
  if (!context) {
    throw new Error("No active business membership found");
  }

  return {
    businessId: context.businessId,
    storeId: context.storeId ?? "00000000-0000-0000-0000-000000000002",
  };
}

const BusinessQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  stockFilter: z.string().optional(),
  payment: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const demo = cookieStore.get("niraya_demo")?.value;
  if (demo === "1") {
    return NextResponse.json(createSeedData());
  }
  
  const user = await requireSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, storeId } = await requireBusinessContext();

  const resolvedBusinessId = businessId!;
  const resolvedStoreId = storeId!;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = BusinessQuerySchema.safeParse({
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      status: searchParams.get("status") || undefined,
      stockFilter: searchParams.get("stockFilter") || undefined,
      payment: searchParams.get("payment") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parameter query tidak valid." },
        { status: 400 }
      );
    }

    const data = await getBusinessData(parsed.data, resolvedBusinessId, resolvedStoreId);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as any;
    const status = Number(err?.status) || 500;
    const safeMessage =
      status >= 500
        ? "Gagal memuat data bisnis."
        : err?.message || "Gagal memuat data.";
    if (status >= 500) console.error("Business data error:", err?.message || err);
    return NextResponse.json({ error: safeMessage, code: status >= 500 ? "BUSINESS_DATA_LOAD_FAILED" : undefined }, { status });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const demo = cookieStore.get("niraya_demo")?.value;
  if (demo === "1") {
    return NextResponse.json({ ok: true });
  }
  
  const user = await requireSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, storeId } = await requireBusinessContext();

  const resolvedBusinessId = businessId!;
  const resolvedStoreId = storeId!;

  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    if (!action) {
      return NextResponse.json({ error: "Aksi wajib diisi." }, { status: 400 });
    }

    const requiredRole = ACTION_ROLES[action];
    if (requiredRole) {
      try {
        await requireRole(requiredRole);
      } catch (error: any) {
        return NextResponse.json(
          { error: error?.message || "Akses ditolak." },
          { status: error?.status ?? 403 }
        );
      }
    }

    const { getCurrentUserRole } = await import("@/server/auth/session");
    const result = await mutateBusiness(action, body?.payload ?? {}, {
      actingUserId: user.id,
      actingUserRole: await getCurrentUserRole(),
      businessId: resolvedBusinessId,
      storeId: resolvedStoreId,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as any;
    const status = Number(err?.status) || 400;
    const message = status >= 500 ? "Gagal menyimpan data." : err?.message || "Gagal menyimpan data.";
    if (status >= 500) console.error("Business mutation error:", err?.message || err);
    return NextResponse.json({ error: message }, { status });
  }
}
