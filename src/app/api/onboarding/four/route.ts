import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, paymentSettings } from "@/server/db/schema";
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
      acceptCash,
      acceptCard,
      acceptQris,
      acceptTransfer,
      qrManualTransferEnabled,
      manualTransferBankName,
      manualTransferAccountName,
      manualTransferAccountNumber,
      manualTransferInstructions,
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
      .insert(paymentSettings)
      .values({
        id: "default",
        businessId,
        acceptCash: acceptCash ?? true,
        acceptCard: acceptCard ?? false,
        acceptQris: acceptQris ?? false,
        acceptTransfer: acceptTransfer ?? true,
        qrManualTransferEnabled: qrManualTransferEnabled ?? false,
        manualTransferBankName: manualTransferBankName?.trim() || null,
        manualTransferAccountName: manualTransferAccountName?.trim() || null,
        manualTransferAccountNumber: manualTransferAccountNumber?.trim() || null,
        manualTransferInstructions: manualTransferInstructions?.trim() || null,
      })
      .onConflictDoUpdate({
        target: paymentSettings.id,
        set: {
          acceptCash: acceptCash ?? true,
          acceptCard: acceptCard ?? false,
          acceptQris: acceptQris ?? false,
          acceptTransfer: acceptTransfer ?? true,
          qrManualTransferEnabled: qrManualTransferEnabled ?? false,
          manualTransferBankName: manualTransferBankName?.trim() || null,
          manualTransferAccountName: manualTransferAccountName?.trim() || null,
          manualTransferAccountNumber: manualTransferAccountNumber?.trim() || null,
          manualTransferInstructions: manualTransferInstructions?.trim() || null,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Pengaturan pembayaran tersimpan" });
  } catch (error) {
    console.error("Onboarding step 4 error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan pembayaran" },
      { status: 500 }
    );
  }
}