import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businesses, notificationSettings, privacySecuritySettings } from "@/server/db/schema";
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
      emailEnabled,
      smsEnabled,
      pushEnabled,
      orderEmail,
      orderSms,
      orderPush,
      lowStockEmail,
      lowStockSms,
      lowStockPush,
      paymentEmail,
      paymentSms,
      paymentPush,
      marketingEmail,
      dataRetentionDays,
      sessionTimeoutMinutes,
      requireTwoFactor,
      allowPasswordLogin,
      allowMagicLink,
      allowSocialLogin,
      auditLogEnabled,
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
      .insert(notificationSettings)
      .values({
        id: "default",
        businessId,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
        pushEnabled: pushEnabled ?? true,
        orderEmail: orderEmail ?? true,
        orderSms: orderSms ?? false,
        orderPush: orderPush ?? true,
        lowStockEmail: lowStockEmail ?? true,
        lowStockSms: lowStockSms ?? false,
        lowStockPush: lowStockPush ?? true,
        paymentEmail: paymentEmail ?? true,
        paymentSms: paymentSms ?? false,
        paymentPush: paymentPush ?? true,
        marketingEmail: marketingEmail ?? false,
      })
      .onConflictDoUpdate({
        target: notificationSettings.id,
        set: {
          emailEnabled: emailEnabled ?? true,
          smsEnabled: smsEnabled ?? false,
          pushEnabled: pushEnabled ?? true,
          orderEmail: orderEmail ?? true,
          orderSms: orderSms ?? false,
          orderPush: orderPush ?? true,
          lowStockEmail: lowStockEmail ?? true,
          lowStockSms: lowStockSms ?? false,
          lowStockPush: lowStockPush ?? true,
          paymentEmail: paymentEmail ?? true,
          paymentSms: paymentSms ?? false,
          paymentPush: paymentPush ?? true,
          marketingEmail: marketingEmail ?? false,
          updatedAt: new Date(),
        },
      });

    await db
      .insert(privacySecuritySettings)
      .values({
        id: "default",
        businessId,
        dataRetentionDays: dataRetentionDays ?? 365,
        sessionTimeoutMinutes: sessionTimeoutMinutes ?? 480,
        requireTwoFactor: requireTwoFactor ?? false,
        allowPasswordLogin: allowPasswordLogin ?? true,
        allowMagicLink: allowMagicLink ?? true,
        allowSocialLogin: allowSocialLogin ?? true,
        auditLogEnabled: auditLogEnabled ?? true,
      })
      .onConflictDoUpdate({
        target: privacySecuritySettings.id,
        set: {
          dataRetentionDays: dataRetentionDays ?? 365,
          sessionTimeoutMinutes: sessionTimeoutMinutes ?? 480,
          requireTwoFactor: requireTwoFactor ?? false,
          allowPasswordLogin: allowPasswordLogin ?? true,
          allowMagicLink: allowMagicLink ?? true,
          allowSocialLogin: allowSocialLogin ?? true,
          auditLogEnabled: auditLogEnabled ?? true,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Pengaturan notifikasi & keamanan tersimpan" });
  } catch (error) {
    console.error("Onboarding step 5 error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan notifikasi & keamanan" },
      { status: 500 }
    );
  }
}