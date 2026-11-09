import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Root path - redirect authenticated users to dashboard
  // Dashboard layout will show onboarding modal if needed
  if (request.nextUrl.pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Auth routes - redirect to dashboard if already logged in
  // Dashboard layout will show onboarding modal if needed
  const authPaths = ["/login", "/signup", "/register", "/forgot-password", "/reset-password", "/auth/callback"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}