import crypto from "crypto";
import { redis } from "@/server/security/redis";

/**
 * Server-side rate limiter.
 * Default: in-memory fixed window (safe fallback for dev/single instance).
 * Distributed: Upstash Redis REST when UPSTASH_REDIS_REST_URL+TOKEN set.
 * Fallback on distributed timeout/error/missing config uses memory and logs a generic warning (no secrets/IPs).
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number; mode: "memory" | "upstash"; degraded?: boolean };

function memoryRateLimit(key: string, opts: { limit: number; windowMs: number }, degraded = false): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt, mode: "memory", degraded };
  }
  if (existing.count >= opts.limit) return { ok: false, remaining: 0, resetAt: existing.resetAt, mode: "memory", degraded };
  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt, mode: "memory", degraded };
}

async function upstashRateLimit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const redisKey = `niraya:rl:${key}:${Math.floor(Date.now() / opts.windowMs)}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, windowSec + 5, "NX"]]),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error("upstash_http");
    const data = (await res.json()) as Array<{ result?: number; error?: string }>;
    if (data?.[0]?.error) throw new Error("upstash_cmd");
    
    const count = Number(data?.[0]?.result ?? opts.limit + 1);
    const resetAt = (Math.floor(Date.now() / opts.windowMs) + 1) * opts.windowMs;
    const ok = count <= opts.limit;
    return { ok, remaining: Math.max(0, opts.limit - count), resetAt, mode: "upstash" };
  } catch (error) {
    console.warn("[rate-limit] distributed limiter unavailable; using fallback", error);
    return null;
  }
}

/** Synchronous memory limiter (legacy callers/tests). */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  return memoryRateLimit(key, opts);
}

/** Preferred for API routes. failClosedOnDegraded: deny when distributed is unavailable in production for sensitive endpoints. */
export async function rateLimitAsync(
  key: string,
  opts: { limit: number; windowMs: number; failClosedOnDegraded?: boolean }
): Promise<RateLimitResult> {
  const distributed = await upstashRateLimit(key, opts);
  if (distributed) return distributed;
  
  const prod = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const configured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  
  if (opts.failClosedOnDegraded && prod && (!configured || !distributed)) {
    return { ok: false, remaining: 0, resetAt: Date.now() + opts.windowMs, mode: "memory", degraded: true };
  }
  return memoryRateLimit(key, opts, prod && !configured);
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function stableRateKey(parts: Array<string | null | undefined>): string {
  const raw = parts.filter(Boolean).join("|") || "unknown";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function rateLimitResponse(resetAt: number, degraded = false) {
  return new Response(JSON.stringify({ error: degraded ? "Layanan pembatasan sementara tidak tersedia. Coba lagi nanti." : "Terlalu banyak permintaan. Coba lagi nanti." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) },
  });
}

/**
 * Redis-based rate limiter for use with Upstash Redis client
 * More efficient for high-traffic scenarios
 */
export async function rateLimitRedis(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    return memoryRateLimit(key, opts, true);
  }
  
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const redisKey = `niraya:rl:${key}:${Math.floor(Date.now() / opts.windowMs)}`;
  
  try {
    const pipeline = [
      ["INCR", redisKey],
      ["EXPIRE", redisKey, windowSec + 5, "NX"]
    ];
    
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(pipeline),
      cache: "no-store",
    });
    
    if (!res.ok) throw new Error("upstash_http");
    const data = (await res.json()) as Array<{ result?: number; error?: string }>;
    if (data?.[0]?.error) throw new Error("upstash_cmd");
    
    const count = Number(data?.[0]?.result ?? opts.limit + 1);
    const resetAt = (Math.floor(Date.now() / opts.windowMs) + 1) * opts.windowMs;
    const ok = count <= opts.limit;
    return { ok, remaining: Math.max(0, opts.limit - count), resetAt, mode: "upstash" };
  } catch (error) {
    console.warn("[rate-limit] Redis limiter failed; using fallback", error);
    return memoryRateLimit(key, opts, true);
  }
}
