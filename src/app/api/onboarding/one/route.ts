import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, businessProfile, businessSettings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/utils";

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
      businessName,
      legalName,
      taxId,
      _nib,
      email,
      phone,
      address,
      _categoryCode,
      _customCategory,
      logoUrl,
      description,
      website,
      socialMedia,
    } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: "Nama usaha wajib diisi" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email usaha wajib diisi" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Telepon usaha wajib diisi" }, { status: 400 });
    }
    if (!address?.trim()) {
      return NextResponse.json({ error: "Alamat usaha wajib diisi" }, { status: 400 });
    }

    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const existing = await db.query.businesses.findFirst({
        where: eq(businesses.slug, slug),
      });
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const newBusiness = await db
      .insert(businesses)
      .values({
        name: businessName.trim(),
        slug,
        legalName: legalName?.trim() || null,
        taxId: taxId?.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        ownerUserId: userId,
        status: "active",
      } as any)
      .returning({ id: businesses.id });

    const businessId = newBusiness[0].id;

    await db.insert(businessProfile).values({
      id: "default",
      businessId,
      businessName: businessName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logoUrl: logoUrl?.trim() || null,
      description: description?.trim() || null,
      website: website?.trim() || null,
      socialMedia: socialMedia?.trim() || null,
    });

    await db.insert(businessSettings).values({
      id: "default",
      businessId,
      businessName: businessName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });

    return NextResponse.json({
      businessId,
      slug,
      message: "Profil usaha tersimpan",
    });
  } catch (error) {
    console.error("Onboarding step 1 error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan profil usaha" },
      { status: 500 }
    );
  }
}