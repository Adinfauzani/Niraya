/**
 * Halaman publik yang selalu memakai tema terang (latar putih) agar identitas
 * brand tetap konsisten meski pengguna memilih tema gelap di aplikasi.
 */
export const LIGHT_ONLY_PATHS = [
  "/",
  "/docs",
  "/plans",
  "/login",
  "/register",
  "/signup",
] as const;

export function isLightOnlyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return LIGHT_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}