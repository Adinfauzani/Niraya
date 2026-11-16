import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeUserWorkspace, checkInitializationStatus } from "@/server/auth/initialization";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);

  try {
    // Check if already initialized
    const status = await checkInitializationStatus(userId);
    if (status.isInitialized) {
      return NextResponse.json({
        success: true,
        businessId: status.businessId,
        storeId: status.storeId,
        isNewUser: false,
      });
    }

    // Initialize workspace
    const name = (session as any)?.user?.user_metadata?.full_name || null;
    const email = (session as any)?.user?.email || null;
    const avatarUrl = (session as any)?.user?.user_metadata?.avatar_url || (session as any)?.user?.user_metadata?.picture || null;

    const result = await initializeUserWorkspace({ userId, name, email, avatarUrl });

    return NextResponse.json({
      success: true,
      businessId: result.businessId,
      storeId: result.storeId,
      isNewUser: result.isNewUser,
    });
  } catch (error) {
    console.error("Initialization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Gagal menginisialisasi workspace";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}