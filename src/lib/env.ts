import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional().default("postgres://dummy:dummy@localhost:5432/dummy"),
  SUPABASE_URL: z.string().min(1).optional().default(""),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional().default(""),
  SUPABASE_SECRET_KEY: z.string().min(1).optional().default(""),
  SUPABASE_JWKS_URL: z.string().min(1).optional().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).optional().default(""),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional().default(""),
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
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  GUMROAD_SELLER_ID: process.env.GUMROAD_SELLER_ID,
  GUMROAD_ACCESS_TOKEN: process.env.GUMROAD_ACCESS_TOKEN,
  GUMROAD_PRODUCT_STARTER: process.env.GUMROAD_PRODUCT_STARTER,
  GUMROAD_PRODUCT_PLUS: process.env.GUMROAD_PRODUCT_PLUS,
  GUMROAD_PRODUCT_PRO: process.env.GUMROAD_PRODUCT_PRO,
  GUMROAD_VERIFY_WEBHOOK: process.env.GUMROAD_VERIFY_WEBHOOK,
});

export type Env = z.infer<typeof envSchema>;