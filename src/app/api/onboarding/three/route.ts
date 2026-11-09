import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, operationalSettings, businessSettings } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);

  try {
    const body = await request.json();
    const {
      businessId,
      currency,
      timezone,
      taxRate,
      memberDiscountRate,
      lowStockThreshold,
      reservationExpiryMinutes,
      autoCancelUnpaidOrders,
      allowSplitPayment,
    } = body;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID diperlukan" }, { status: 400 });
    }

    const business = await db.query.businesses.findFirst({
      where: and(eq(businesses.id, businessId), eq(businesses.ownerUserId, userId)),
    });

    if (!business) {
      return NextResponse.json({ error: "Usaha tidak ditemukan atau bukan pemilik" }, { status: 403 });
    }

    await db
      .update(businessSettings)
      .set({
        currency: currency || "IDR",
        timezone: timezone || "Asia/Jakarta",
        taxRate: taxRate ?? "0",
        memberDiscountRate: memberDiscountRate ?? "0",
        lowStockThreshold: lowStockThreshold ?? 10,
        reservationExpiryMinutes: reservationExpiryMinutes ?? 30,
      })
      .where(eq(businessSettings.businessId, businessId));

    await db
      .insert(operationalSettings)
      .values({
        id: "default",
        businessId,
        currency: currency || "IDR",
        timezone: timezone || "Asia/Jakarta",
        taxRate: taxRate ?? "0",
        memberDiscountRate: memberDiscountRate ?? "0",
        lowStockThreshold: lowStockThreshold ?? 10,
        reservationExpiryMinutes: reservationExpiryMinutes ?? 30,
        autoCancelUnpaidOrders: autoCancelUnpaidOrders ?? true,
        allowSplitPayment: allowSplitPayment ?? true,
      })
      .onConflictDoUpdate({
        target: operationalSettings.id,
        set: {
          currency: currency || "IDR",
          timezone: timezone || "Asia/Jakarta",
          taxRate: taxRate ?? "0",
          memberDiscountRate: memberDiscountRate ?? "0",
          lowStockThreshold: lowStockThreshold ?? 10,
          reservationExpiryMinutes: reservationExpiryMinutes ?? 30,
          autoCancelUnpaidOrders: autoCancelUnpaidOrders ?? true,
          allowSplitPayment: allowSplitPayment ?? true,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Pengaturan operasional tersimpan" });
  } catch (error) {
    console.error("Onboarding step 3 error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan operasional" },
      { status: 500 }
    );
  }
}