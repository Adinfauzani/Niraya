import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { stores } from "@/server/db/schema";
import { executePosCheckout } from "@/server/pos/CheckoutCore";
import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";
import { getBusinessContext } from "@/server/auth/BusinessContext";

async function checkMaintenanceMode(): Promise<{ enabled: boolean; estimatedEndAt: Date | null }> {
  const config = await getMaintenanceConfig();
  if (!config.enabled) {
    return { enabled: false, estimatedEndAt: null };
  }
  return { enabled: true, estimatedEndAt: resolveEstimatedEndAt(config) };
}

const CheckoutSchema = z.object({
  idempotencyKey: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  paymentMethod: z.enum(["cash", "card", "qris", "manual_transfer"]),
  paymentAmount: z.number().positive().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  orderType: z.enum(["dine-in", "takeaway"]).default("dine-in"),
  tableNumber: z.string().optional(),
  discount: z.number().min(0).default(0),
  // Diterima untuk kompatibilitas klien lama; nilai final dihitung server.
  tax: z.number().min(0).optional(),
  cashier: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check maintenance mode
    const maintenance = await checkMaintenanceMode();
    if (maintenance.enabled) {
      return NextResponse.json(
        {
          error: "Sistem sedang dalam mode maintenance. Checkout tidak tersedia.",
          code: "MAINTENANCE_MODE",
          estimatedEndAt: maintenance.estimatedEndAt?.toISOString() ?? null,
        },
        { status: 503 }
      );
    }

    const session = await getSession();
    const user =
      (session as any)?.user ?? (session as any)?.data?.user ?? null;

    if (!user) {
      return NextResponse.json(
        { error: "Checkout hanya tersedia untuk akun terdaftar." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data checkout tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const context = await getBusinessContext(user.id);
    if (!context?.businessId) {
      return NextResponse.json(
        { error: "Tidak ada konteks bisnis aktif. Silakan selesaikan onboarding." },
        { status: 400 }
      );
    }
    const response = await executePosCheckout(db, payload, {
      id: String(user.id),
      name: user.name ?? null,
    }, context.businessId, context.storeId ?? "");
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Checkout error:", error?.message ?? error);
    return NextResponse.json(
      { error: error?.message || "Checkout gagal." },
      { status: error?.status ?? 400 }
    );
  }
}
