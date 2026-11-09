import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, stores, storeSettings } from "@/server/db/schema";
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
    const { businessId, storeName, storeCode, address, phone, email, timezone } = body;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID diperlukan" }, { status: 400 });
    }
    if (!storeName?.trim()) {
      return NextResponse.json({ error: "Nama toko wajib diisi" }, { status: 400 });
    }
    if (!storeCode?.trim()) {
      return NextResponse.json({ error: "Kode toko wajib diisi" }, { status: 400 });
    }

    const business = await db.query.businesses.findFirst({
      where: and(eq(businesses.id, businessId), eq(businesses.ownerUserId, userId)),
    });

    if (!business) {
      return NextResponse.json({ error: "Usaha tidak ditemukan atau bukan pemilik" }, { status: 403 });
    }

    const existingCode = await db.query.stores.findFirst({
      where: and(eq(stores.businessId, businessId), eq(stores.code, storeCode.trim().toUpperCase())),
    });

    if (existingCode) {
      return NextResponse.json({ error: "Kode toko sudah digunakan" }, { status: 400 });
    }

    const newStore = await db
      .insert(stores)
      .values({
        businessId,
        name: storeName.trim(),
        code: storeCode.trim().toUpperCase(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        timezone: timezone || "Asia/Jakarta",
        isActive: true,
      })
      .returning({ id: stores.id });

    const storeId = newStore[0].id;

    await db.insert(storeSettings).values({
      businessId,
      storeId,
    });

    return NextResponse.json({
      storeId,
      message: "Toko pertama tersimpan",
    });
  } catch (error) {
    console.error("Onboarding step 2 error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan toko" },
      { status: 500 }
    );
  }
}