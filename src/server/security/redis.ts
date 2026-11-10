/**
 * Upstash Redis client wrapper for serverless environments.
 * Provides a simple interface for Redis operations via REST API.
 */

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number; nx?: boolean; xx?: boolean }): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  mget(...keys: string[]): Promise<Array<string | null>>;
  pipeline(commands: Array<Array<string>>): Promise<Array<{ result?: unknown; error?: string }>>;
  [key: string]: unknown;
}

function createRestClient(): RedisClient {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
  }
  
  const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
  const auth = `Bearer ${token}`;
  
  async function request(body: Array<Array<string>>) {
    const res = await fetch(`${baseUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: auth, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash HTTP ${res.status}: ${text}`);
    }
    
    return res.json() as Promise<Array<{ result?: unknown; error?: string }>>;
  }
  
  return {
    async get(key: string) {
      const result = await request([["GET", key]]);
      return (result[0]?.result as string) ?? null;
    },
    
    async set(key: string, value: string, opts?: { ex?: number; nx?: boolean; xx?: boolean }) {
      const args = [key, value];
      if (opts?.ex) args.push("EX", String(opts.ex));
      if (opts?.nx) args.push("NX");
      if (opts?.xx) args.push("XX");
      const result = await request([["SET", ...args]]);
      return (result[0]?.result as string) ?? null;
    },
    
    async incr(key: string) {
      const result = await request([["INCR", key]]);
      return Number(result[0]?.result ?? 0);
    },
    
    async expire(key: string, seconds: number) {
      const result = await request([["EXPIRE", key, String(seconds)]]);
      return Number(result[0]?.result ?? 0);
    },
    
    async del(key: string) {
      const result = await request([["DEL", key]]);
      return Number(result[0]?.result ?? 0);
    },
    
    async exists(key: string) {
      const result = await request([["EXISTS", key]]);
      return Number(result[0]?.result ?? 0);
    },
    
    async mget(...keys: string[]) {
      const result = await request([["MGET", ...keys]]);
      return (result[0]?.result as Array<string | null>) ?? keys.map(() => null);
    },
    
    async pipeline(commands: Array<Array<string>>) {
      return request(commands);
    },
  };
}

// Lazy singleton
let _redis: RedisClient | null = null;

export function getRedis(): RedisClient | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  
  if (!_redis) {
    try {
      _redis = createRestClient();
    } catch (error) {
      console.warn("[redis] Failed to create Upstash client:", error);
      return null;
    }
  }
  
  return _redis;
}

// Export a null-safe proxy for convenience
export const redis = new Proxy({} as RedisClient, {
  get(_target, prop: string) {
    const client = getRedis();
    if (!client) {
      throw new Error("Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    return (client as Record<string, unknown>)[prop];
  },
});