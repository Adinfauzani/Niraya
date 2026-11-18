export function assertSameOriginIfCookieAuth(
  request: Request,
): { ok: true } | { ok: false; status: 403; error: string } {
  if (!request.headers.get("cookie")) return { ok: true };

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let candidate: string | null = null;
  if (origin && origin !== "null") candidate = origin;
  else if (referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {}
  }

  if (!candidate) {
    if (request.headers.get("sec-fetch-site") === "same-origin") return { ok: true };
    return { ok: false, status: 403, error: "Origin permintaan tidak valid." };
  }

  const allowedHosts = new Set<string>();
  const addHosts = (value: string | null) => {
    if (!value) return;
    for (const part of value.split(",")) {
      const h = part.trim().toLowerCase();
      if (h) allowedHosts.add(h);
    }
  };
  addHosts(request.headers.get("host"));
  addHosts(request.headers.get("x-forwarded-host"));
  try {
    allowedHosts.add(new URL(request.url).host.toLowerCase());
  } catch {}

  try {
    const candidateHost = new URL(candidate).host.toLowerCase();
    if (allowedHosts.has(candidateHost)) return { ok: true };
  } catch {}

  return { ok: false, status: 403, error: "Origin permintaan tidak valid." };
}
