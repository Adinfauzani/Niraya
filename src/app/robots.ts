import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/pos",
        "/onboarding",
        "/profile",
        "/settings",
        "/staff",
        "/reports",
        "/transactions",
        "/orders",
        "/customers",
        "/inventory",
        "/products",
        "/categories",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}