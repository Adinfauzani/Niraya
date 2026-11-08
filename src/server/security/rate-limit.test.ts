import { afterEach, expect, test } from "bun:test";
import { getClientIp, rateLimit, rateLimitAsync, stableRateKey } from "./rate-limit";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; (globalThis.fetch as any) = undefined; });

test("memory rateLimit enforces fixed window", () => {
  const k = `t:${Math.random()}`;
  for (let i=0;i<3;i++) expect(rateLimit(k,{limit:3,windowMs:60_000}).ok).toBe(true);
  expect(rateLimit(k,{limit:3,windowMs:60_000}).ok).toBe(false);
});
test("stableRateKey hashes and isolates", () => {
  expect(stableRateKey(["a"])).not.toBe(stableRateKey(["b"]));
  expect(stableRateKey(["a"]).length).toBe(24);
});
test("getClientIp prefers first x-forwarded-for", () => {
  expect(getClientIp(new Request("http://x",{headers:{"x-forwarded-for":"1.2.3.4, 5.6.7.8"}}))).toBe("1.2.3.4");
});
test("rateLimitAsync falls back to memory when config missing", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const r = await rateLimitAsync(`m:${Math.random()}`, { limit: 1, windowMs: 60_000 });
  expect(r.ok).toBe(true); expect(r.mode).toBe("memory");
});
test("rateLimitAsync uses upstash when configured", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "t";
  globalThis.fetch = async () => new Response(JSON.stringify([{result:1},{result:1}]), {status:200}) as any;
  const r = await rateLimitAsync(`u:${Math.random()}`, { limit: 2, windowMs: 60_000 });
  expect(r.mode).toBe("upstash"); expect(r.ok).toBe(true);
});
test("rateLimitAsync falls back on upstash timeout/error", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "t";
  globalThis.fetch = async () => { throw new Error("timeout"); };
  const r = await rateLimitAsync(`e:${Math.random()}`, { limit: 2, windowMs: 60_000 });
  expect(r.mode).toBe("memory");
});
test("rateLimitAsync failClosedOnDegraded denies in production when distributed unavailable", async () => {
  process.env.NODE_ENV = "production"; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const r = await rateLimitAsync(`p:${Math.random()}`, { limit: 2, windowMs: 60_000, failClosedOnDegraded: true });
  expect(r.ok).toBe(false); expect(r.degraded).toBe(true);
});
