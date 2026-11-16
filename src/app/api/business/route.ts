import { NextResponse } from "next/server";
import { z } from "zod";

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
import { updateOrderStatus } from "@/server/services/OrderService";
import {
  createStore,
  updateStore,
  deleteStore,
} from "@/server/services/StoreService";
import {
  requireRole,
  ACTION_ROLES,
} from "@/server/auth/session";
import {
  requireBusinessContext,
  requireSession,
} from "@/server/auth/routeContext";
import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";

export const runtime = "nodejs";

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

async function resolveBusinessContext(): Promise<
  | { ok: true; businessId: string; storeId: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const context = await requireBusinessContext();
    if (!context.businessId || !context.storeId) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Belum ada bisnis aktif untuk akun ini.",
            code: "NO_BUSINESS",
            needsOnboarding: true,
          },
          { status: 409 }
        ),
      };
    }
    return { ok: true, businessId: context.businessId, storeId: context.storeId };
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === "No active business membership found") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Belum ada bisnis aktif untuk akun ini.",
            code: "NO_BUSINESS",
            needsOnboarding: true,
          },
          { status: 409 }
        ),
      };
    }
    console.error("Business context error:", message);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Gagal memuat data bisnis.", code: "BUSINESS_CONTEXT_FAILED" },
        { status: 500 }
      ),
    };
  }
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

  const context = await resolveBusinessContext();
  if (!context.ok) return context.response;

  const resolvedBusinessId = context.businessId;
  const resolvedStoreId = context.storeId;

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

  const context = await resolveBusinessContext();
  if (!context.ok) return context.response;

  const resolvedBusinessId = context.businessId;
  const resolvedStoreId = context.storeId;

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
      case "order.status":
        result = await updateOrderStatus({
          businessId: resolvedBusinessId,
          storeId: resolvedStoreId,
          orderId: payload.id,
          status: payload.status,
          changedByUserId: user.id,
          changedByRole: (user as any)?.role ?? null,
          reason: payload.reason,
        });
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
