import { createSupabaseServerClient } from "@/server/auth/supabase";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const membership = await db.query.businessMembers.findFirst({
          where: and(
            eq(businessMembers.userId, user.id),
            eq(businessMembers.role, "owner"),
            eq(businessMembers.status, "active")
          ),
        });
        const redirectTo = membership ? "/dashboard" : "/onboarding";
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}