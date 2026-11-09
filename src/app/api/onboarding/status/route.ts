import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkInitializationStatus } from "@/server/auth/initialization";

export async function GET() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);

  try {
    const status = await checkInitializationStatus(userId);

    return NextResponse.json({
      needsOnboarding: !status.isInitialized,
      isInitialized: status.isInitialized,
      businessId: status.businessId,
      storeId: status.storeId,
    });
  } catch (error) {
    console.error("Onboarding status error:", error);
    return NextResponse.json({ error: "Gagal memeriksa status" }, { status: 500 });
  }
}