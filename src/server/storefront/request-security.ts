export function assertSameOriginIfCookieAuth(request: Request): { ok: true } | { ok: false; status: 403; error: string } {
  if (!request.headers.get("cookie")) return { ok: true };
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || new URL(request.url).host;
  let candidate: string | null = null;
  if (origin && origin !== "null") candidate = origin;
  else if (referer) { try { candidate = new URL(referer).origin; } catch {} }
  if (!candidate) return { ok: false, status: 403, error: "Akses tidak valid." };
  try {
    const c = new URL(candidate);
    if (c.host === host) return { ok: true };
  } catch {}
  return { ok: false, status: 403, error: "Akses tidak valid." };
}
