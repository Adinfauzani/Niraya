import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth/config";

import { getUserTenantContext, TenantValidationError } from "@/lib/tenant";
import { getCurrentUserRole } from "@/server/auth/session";

const MAINTENANCE_BYPASS_PATHS = [
  "/api/maintenance",
  "/api/auth",
  "/api/health",
  "/api/internal",
  "/api/webhooks",
  "/api/billing",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/verify",
];

async function checkMaintenanceMode(request: NextRequest): Promise<{ enabled: boolean; estimatedEndAt: string | null }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const res = await fetch(`${baseUrl}/api/maintenance/status`, {
      cache: "no-store",
      headers: { "x-maintenance-check": "true" },
    });
    if (res.ok) {
      const data = await res.json();
      return { enabled: data.enabled === true, estimatedEndAt: data.estimatedEndAt ?? null };
    }
  } catch {
    // If check fails, assume no maintenance to avoid blocking
  }
  return { enabled: false, estimatedEndAt: null };
}

async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

async function validateTenant(
  request: NextRequest,
  userId: string
): Promise<{ businessId: string; storeId: string } | null> {
  try {
    const context = await getUserTenantContext(userId);
    return context ? { businessId: context.businessId, storeId: context.storeId! } : null;
  } catch (e) {
    if (e instanceof TenantValidationError) return null;
    throw e;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const user = await getAuthenticatedUser(request);

  // Check maintenance mode for protected routes
  const isMaintenanceBypass = MAINTENANCE_BYPASS_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  let maintenanceInfo = { enabled: false, estimatedEndAt: null as string | null };

  if (!isMaintenanceBypass) {
    maintenanceInfo = await checkMaintenanceMode(request);
    if (maintenanceInfo.enabled) {
      // Block API mutations
      if (request.nextUrl.pathname.startsWith("/api/") &&
        !request.nextUrl.pathname.startsWith("/api/maintenance") &&
        request.method !== "GET") {
        return NextResponse.json(
          {
            error: "Sistem sedang dalam mode maintenance. Operasi tulis diblokir.",
            code: "MAINTENANCE_MODE",
            estimatedEndAt: maintenanceInfo.estimatedEndAt,
          },
          { status: 503 }
        );
      }
    }
  }

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

  // Add tenant context headers for downstream use
  if (user?.id) {
    const tenant = await validateTenant(request, user.id);
    if (tenant) {
      response.headers.set("x-tenant-business-id", tenant.businessId);
      response.headers.set("x-tenant-store-id", tenant.storeId);
    }
  }

  // Root path - redirect authenticated users to dashboard
  if (request.nextUrl.pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Auth routes - redirect to dashboard if already logged in
  const authPaths = ["/login", "/signup", "/register", "/forgot-password", "/reset-password", "/auth/callback"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role `user` (akun dasar tanpa bisnis) tidak boleh masuk dashboard —
  // arahkan ke halaman profil, kecuali saat masih dalam alur onboarding
  // (`/dashboard/onboarding`). Dilakukan di proxy (server) agar konsisten
  // dengan `(dashboard)/layout.tsx` yang mengharapkan halaman profil untuk
  // role dasar. Melewati `/api/me`, `/api/onboarding`, dan `/api/business`
  // agar tidak loop.
  if (user?.id && request.nextUrl.pathname.startsWith("/dashboard")) {
    const role = await getCurrentUserRole();
    const isOnboardingFlow =
      request.nextUrl.pathname === "/dashboard/onboarding" ||
      request.nextUrl.pathname.startsWith("/dashboard/onboarding/");
    if (role === "user" && !isOnboardingFlow && !request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/profile", request.url));
    }
  }

  // Add maintenance headers for client
  if (maintenanceInfo.enabled) {
    response.headers.set("x-maintenance-enabled", "true");
    if (maintenanceInfo.estimatedEndAt) {
      response.headers.set("x-maintenance-estimated-end", maintenanceInfo.estimatedEndAt);
    }
  }

  return response;
}