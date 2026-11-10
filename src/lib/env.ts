import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional().default("postgres://dummy:dummy@localhost:5432/dummy"),
  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().optional(),
  BETTER_AUTH_API_KEY: z.string().optional().default(""),
  // OAuth providers
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Gumroad membership. Defaults live in `src/lib/plans.ts`; these variables
  // are optional overrides for the webhook-to-plan mapping.
  GUMROAD_SELLER_ID: z.string().optional().default(""),
  GUMROAD_ACCESS_TOKEN: z.string().optional().default(""),
  GUMROAD_PRODUCT_STARTER: z.string().optional().default(""),
  GUMROAD_PRODUCT_PLUS: z.string().optional().default(""),
  GUMROAD_PRODUCT_PRO: z.string().optional().default(""),
  GUMROAD_VERIFY_WEBHOOK: z.string().optional().default("false"),
  // Upstash Redis (optional, for distributed rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_API_KEY: process.env.BETTER_AUTH_API_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  GUMROAD_SELLER_ID: process.env.GUMROAD_SELLER_ID,
  GUMROAD_ACCESS_TOKEN: process.env.GUMROAD_ACCESS_TOKEN,
  GUMROAD_PRODUCT_STARTER: process.env.GUMROAD_PRODUCT_STARTER,
  GUMROAD_PRODUCT_PLUS: process.env.GUMROAD_PRODUCT_PLUS,
  GUMROAD_PRODUCT_PRO: process.env.GUMROAD_PRODUCT_PRO,
  GUMROAD_VERIFY_WEBHOOK: process.env.GUMROAD_VERIFY_WEBHOOK,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export type Env = z.infer<typeof envSchema>;