import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { stores } from "@/server/db/schema";
import { getSession } from "@/lib/auth";
import { getBusinessData } from "@/server/business/service";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/server/services/CategoryService";
import {
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "@/server/services/ProductService";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/server/services/CustomerService";
import {
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/server/services/StaffService";
import { adjustStock } from "@/server/services/StockService";
import { voidTransaction } from "@/server/services/TransactionService";
import {
  createStore,
  updateStore,
  deleteStore,
} from "@/server/services/StoreService";
import {
  ensureUserProfile,
  requireRole,
  ACTION_ROLES,
} from "@/server/auth/session";
import { getBusinessContext, getActiveBusinessIds } from "@/server/auth/BusinessContext";
import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";

async function checkMaintenanceMode(): Promise<{ enabled: boolean; startedAt: Date | null; estimatedEndAt: Date | null }> {
  const config = await getMaintenanceConfig();
  if (!config.enabled) {
    return { enabled: false, startedAt: null, estimatedEndAt: null };
  }
  return {
    enabled: true,
    startedAt: config.startedAt,
    estimatedEndAt: resolveEstimatedEndAt(config),
  };
}

async function requireSession() {
  const session = await getSession();
  const user =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (user?.id) await ensureUserProfile(user);

  return user;
}

async function requireBusinessContext() {
  const cookieStore = await cookies();
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
  const user = await requireSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check maintenance mode for write operations
  const maintenance = await checkMaintenanceMode();
  if (maintenance.enabled) {
    return NextResponse.json(
      { 
        error: "Sistem sedang dalam mode maintenance. Operasi tulisan diblokir.",
        code: "MAINTENANCE_MODE",
        estimatedEndAt: maintenance.estimatedEndAt?.toISOString() ?? null,
      },
      { status: 503 }
    );
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

    const payload = body?.payload ?? {};
    let result: { ok: true };

    switch (action) {
      case "category.create":
        result = await createCategory(resolvedBusinessId, {
          id: payload.id,
          name: payload.name,
          description: payload.description,
          status: payload.status,
        });
        break;
      case "category.update":
        result = await updateCategory(resolvedBusinessId, payload.id, {
          name: payload.name,
          description: payload.description,
          status: payload.status,
        });
        break;
      case "category.delete":
        result = await deleteCategory(resolvedBusinessId, payload.id);
        break;
      case "product.create":
        result = await createProduct(resolvedBusinessId, resolvedStoreId, {
          id: payload.id,
          name: payload.name,
          sku: payload.sku,
          barcode: payload.barcode,
          categoryId: payload.categoryId,
          price: payload.price,
          cost: payload.cost,
          stock: payload.stock,
          minStock: payload.minStock,
          unit: payload.unit,
          imageUrl: payload.imageUrl,
          status: payload.status,
        });
        break;
      case "product.update":
        result = await updateProduct(resolvedBusinessId, resolvedStoreId, payload.id, {
          name: payload.name,
          sku: payload.sku,
          barcode: payload.barcode,
          categoryId: payload.categoryId,
          price: payload.price,
          cost: payload.cost,
          stock: payload.stock,
          minStock: payload.minStock,
          unit: payload.unit,
          imageUrl: payload.imageUrl,
          status: payload.status,
        });
        break;
      case "product.status":
        result = await updateProductStatus(resolvedBusinessId, payload.id, payload.status);
        break;
      case "product.delete":
        result = await deleteProduct(resolvedBusinessId, resolvedStoreId, payload.id);
        break;
      case "customer.create":
        result = await createCustomer(resolvedBusinessId, {
          id: payload.id,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
          joinedAt: payload.joinedAt,
        });
        break;
      case "customer.update":
        result = await updateCustomer(resolvedBusinessId, payload.id, {
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
        });
        break;
      case "customer.delete":
        result = await deleteCustomer(resolvedBusinessId, payload.id);
        break;
      case "staff.create":
        result = await createStaff(resolvedBusinessId, resolvedStoreId, {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          status: payload.status,
          joinedAt: payload.joinedAt,
        });
        break;
      case "staff.update":
        result = await updateStaff(resolvedBusinessId, payload.id, {
          name: payload.name,
          email: payload.email,
          role: payload.role,
          status: payload.status,
        });
        break;
      case "staff.delete":
        result = await deleteStaff(resolvedBusinessId, payload.id);
        break;
      case "stock.adjust":
        result = await adjustStock(resolvedBusinessId, resolvedStoreId, {
          productId: payload.productId,
          quantity: payload.quantity,
          mode: payload.mode,
          note: payload.note,
          staff: payload.staff,
          movementId: payload.movementId,
          actingUserId: user.id,
        });
        break;
      case "transaction.void":
        result = await voidTransaction(resolvedBusinessId, resolvedStoreId, payload.id, payload.reason);
        break;
      case "store.create":
        result = await createStore(resolvedBusinessId, {
          id: payload.id,
          name: payload.name,
          code: payload.code,
          address: payload.address,
          phone: payload.phone,
          email: payload.email,
          timezone: payload.timezone,
          isActive: payload.isActive,
          createdAt: payload.createdAt,
        });
        break;
      case "store.update":
        result = await updateStore(resolvedBusinessId, payload.id, {
          name: payload.name,
          code: payload.code,
          address: payload.address,
          phone: payload.phone,
          email: payload.email,
          timezone: payload.timezone,
          isActive: payload.isActive,
        });
        break;
      case "store.delete":
        result = await deleteStore(resolvedBusinessId, payload.id);
        break;
      default:
        throw new Error(`Aksi tidak dikenal: ${action}`);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as any;
    const status = Number(err?.status) || 400;
    const message = status >= 500 ? "Gagal menyimpan data." : err?.message || "Gagal menyimpan data.";
    if (status >= 500) console.error("Business mutation error:", err?.message || err);
    return NextResponse.json({ error: message }, { status });
  }
}
