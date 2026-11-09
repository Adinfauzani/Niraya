import { createSupabaseServerClient } from "@/server/auth/supabase";
import { NextResponse } from "next/server";
import { initializeUserWorkspace } from "@/server/auth/initialization";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const userId = data.user.id;
      const name = data.user.user_metadata?.full_name || null;
      const email = data.user.email || null;
      const avatarUrl = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null;

      try {
        await initializeUserWorkspace({ userId, name, email, avatarUrl });
      } catch (e) {
        console.error("Workspace initialization error:", e);
        // Don't fail auth, initialization will be retried on dashboard
      }

      // Redirect to onboarding page which handles initialization check
      return NextResponse.redirect(new URL("/dashboard/onboarding", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}