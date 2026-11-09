import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: _options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options: _options }) =>
            supabaseResponse.cookies.set(name, value, _options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes - redirect to login if no user
  const protectedPaths = [
    "/dashboard",
    "/api/business",
    "/api/pos",
    "/api/staff",
    "/api/settings",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes - redirect to dashboard/onboarding if already logged in
  const authPaths = ["/login", "/signup", "/register", "/forgot-password", "/reset-password", "/auth/callback"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
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

  // Redirect authenticated users without onboarding to onboarding page
  const onboardingExemptPaths = ["/onboarding", "/api/onboarding", "/verify", "/profile"];
  const isOnboardingExempt = onboardingExemptPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (user && !isOnboardingExempt && !isAuthPage && !isProtected) {
    const membership = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.userId, user.id),
        eq(businessMembers.role, "owner"),
        eq(businessMembers.status, "active")
      ),
    });
    if (!membership && !request.nextUrl.pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return supabaseResponse;
}