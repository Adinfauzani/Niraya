import { auth } from "@/server/auth";

export default auth.middleware({
  loginUrl: "/login",
  publicRoutes: [
    "/",
    "/login",
    "/signup",
    "/register",
    "/menu",
    "/menu/(.*)",
    "/profile",
    "/api/business",
    "/api/demo/seed",
    "/qr/(.*)", // legacy static QR links redirect to /menu (no token auth context)
    "/api/public",
    "/api/public/(.*)",
    "/api/internal/jobs/(.*)",
  ],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
