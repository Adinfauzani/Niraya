import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth/config";

import { getUserTenantContext, TenantValidationError } from "@/lib/tenant";
import { readUserRole } from "@/server/auth/session";
import { getMaintenanceConfig, resolveEstimatedEndAt } from "@/server/maintenance";

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

const MAINTENANCE_CACHE_TTL_MS = 60_000;
let maintenanceCache: {
  enabled: boolean;
  estimatedEndAt: string | null;
  expiresAt: number;
} | null = null;

/**
 * Cache the resolved auth context (user + tenant) per session token.
 *
 * The proxy previously ran 5-6 DB round-trips on EVERY request (session lookup,
 * tenant membership, business, store). On a high-latency link to Supabase that
 * was 2-3s per request and made the whole app feel stuck. The context changes
 * rarely, so a short TTL cache removes almost all of that cost. Tenant changes
 * take effect within the TTL; logout clears the cookie, so a stale entry
 * becomes unreachable. The role is resolved lazily only for `/dashboard`.
 */
type CachedAuthContext = {
  userId: string;
  businessId: string | null;
  storeId: string | null;
  expiresAt: number;
};

const AUTH_CONTEXT_CACHE_TTL_MS = 120_000;
const AUTH_CONTEXT_CACHE_MAX_ENTRIES = 5000;
const authContextCache = new Map<string, CachedAuthContext>();

function readCachedAuth(token: string | undefined): CachedAuthContext | null {
  if (!token) return null;
  const entry = authContextCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    authContextCache.delete(token);
    return null;
  }
  return entry;
}

function writeCachedAuth(
  token: string | undefined,
  value: Omit<CachedAuthContext, "expiresAt">
) {
  if (!token) return;
  if (authContextCache.size >= AUTH_CONTEXT_CACHE_MAX_ENTRIES) {
    const oldest = authContextCache.keys().next().value;
    if (oldest) authContextCache.delete(oldest);
  }
  authContextCache.set(token, {
    ...value,
    expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
  });
}

async function checkMaintenanceMode(): Promise<{ enabled: boolean; estimatedEndAt: string | null }> {
  // Cache the maintenance flag briefly so every request does not trigger an
  // extra DB query. The write path still blocks on a stale cache for at most
  // the TTL. The query runs in-process instead of a self-fetch HTTP request,
  // which previously added a full extra round-trip (and a second proxy pass)
  // on every cache miss.
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return {
      enabled: maintenanceCache.enabled,
      estimatedEndAt: maintenanceCache.estimatedEndAt,
    };
  }

  try {
    const config = await getMaintenanceConfig();
    const result = {
      enabled: config.enabled === true,
      estimatedEndAt: resolveEstimatedEndAt(config)?.toISOString() ?? null,
    };
    maintenanceCache = { ...result, expiresAt: now + MAINTENANCE_CACHE_TTL_MS };
    return result;
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
  } catch {
    // Fail open: DB/pool exhaustion must not crash the proxy (which would
    // block every route, including login). Downstream handlers re-resolve.
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const token = request.cookies.get("better-auth.session_token")?.value;
  const cached = readCachedAuth(token);

  // Hanya rute API bisnis ini yang membaca header tenant dari proxy.
  // Lewati lookup tenant DB untuk halaman publik/navigasi agar beban koneksi
  // DB (penting di serverless + session pooler) tidak meledak per-request.
  const needsTenant =
    request.nextUrl.pathname.startsWith("/api/business") ||
    request.nextUrl.pathname.startsWith("/api/pos") ||
    request.nextUrl.pathname.startsWith("/api/staff") ||
    request.nextUrl.pathname.startsWith("/api/settings");

  let user: { id: string } | null = null;
  let tenant: { businessId: string; storeId: string } | null = null;

  if (cached) {
    user = { id: cached.userId };
    tenant = cached.businessId
      ? { businessId: cached.businessId, storeId: cached.storeId ?? "" }
      : null;
  } else {
    const sessionUser = await getAuthenticatedUser(request);
    user = sessionUser ? { id: sessionUser.id } : null;
    if (sessionUser?.id) {
      if (needsTenant) {
        tenant = await validateTenant(request, sessionUser.id);
        writeCachedAuth(token, {
          userId: sessionUser.id,
          businessId: tenant?.businessId ?? null,
          storeId: tenant?.storeId ?? null,
        });
      } else {
        // Cache identitas user saja; tenant di-resolve saat rute API butuh.
        writeCachedAuth(token, {
          userId: sessionUser.id,
          businessId: null,
          storeId: null,
        });
      }
    }
  }

  // Check maintenance mode for protected routes
  const isMaintenanceBypass = MAINTENANCE_BYPASS_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  let maintenanceInfo = { enabled: false, estimatedEndAt: null as string | null };

  if (!isMaintenanceBypass) {
    maintenanceInfo = await checkMaintenanceMode();
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

  // Halaman dashboard (di dalam route group `(dashboard)`) yang hanya boleh
  // diakses oleh role operasional (bukan `user`). Semua path ini diperlakukan
  // sama seperti `/dashboard` untuk redirect login & role.
  // Catatan: `/orders/me` adalah aktivitas milik pengguna (bukan halaman staf),
  // jadi dikecualikan dari pembatasan role dashboard.
  const dashboardPagePaths = [
    "/dashboard",
    "/products",
    "/inventory",
    "/categories",
    "/customers",
    "/orders",
    "/transactions",
    "/reports",
    "/pos",
    "/staff",
    "/settings",
    "/help",
  ];

  const matchesPrefix = (pathname: string, prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  const isOrdersMe = matchesPrefix(request.nextUrl.pathname, "/orders/me");

  // Protected routes - redirect to login if no user
  const protectedPaths = [
    ...dashboardPagePaths,
    "/onboarding",
    "/orders/me",
    "/docs",
    "/api/business",
    "/api/pos",
    "/api/staff",
    "/api/settings",
  ];

  const isProtected = protectedPaths.some((path) =>
    matchesPrefix(request.nextUrl.pathname, path)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add tenant context headers for downstream use
  if (tenant) {
    response.headers.set("x-tenant-business-id", tenant.businessId);
    response.headers.set("x-tenant-store-id", tenant.storeId);
  }

  const authPaths = ["/login", "/signup", "/register", "/forgot-password", "/reset-password", "/auth/callback"];
  const isAuthPage = authPaths.some((path) =>
    matchesPrefix(request.nextUrl.pathname, path)
  );

  // Landing (/) publik untuk guest; pengguna login diarahkan ke discovery home.
  if (user && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Halaman login/signup: pengguna login diarahkan ke discovery home.
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Role `user` (akun dasar tanpa bisnis) tidak boleh masuk halaman dashboard —
  // arahkan ke halaman profil, kecuali saat masih dalam alur onboarding.
  // `/orders/me` dikecualikan agar pengguna dapat melihat aktivitas pesanan sendiri.
  if (user?.id && !isOrdersMe) {
    const isDashboardPage = dashboardPagePaths.some((path) =>
      matchesPrefix(request.nextUrl.pathname, path)
    );
    const isOnboardingFlow =
      matchesPrefix(request.nextUrl.pathname, "/onboarding");
    if (
      isDashboardPage &&
      !isOnboardingFlow &&
      !request.nextUrl.pathname.startsWith("/api/")
    ) {
      const role = await readUserRole(user.id);
      if (role === "user") {
        return NextResponse.redirect(new URL("/profile", request.url));
      }
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