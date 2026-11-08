import { and, asc, eq, isNull } from "drizzle-orm";
import { LandingPage } from "@/components/landing/landing-page";
import { db } from "@/server/db";
import { categories, products } from "@/server/db/schema/products";
import { DEFAULT_BUSINESS_ID } from "@/server/db/schema/schema";

export const dynamic = "force-dynamic";

export type LandingMenuItem = {
  id: string;
  name: string;
  category: string | null;
  price: string;
  unit: string;
  imageUrl: string | null;
};

async function getLandingMenu(): Promise<LandingMenuItem[]> {
  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.sellingPrice,
        unit: products.unit,
        imageUrl: products.imageUrl,
        category: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.businessId, DEFAULT_BUSINESS_ID),
          eq(products.status, "active"),
          isNull(products.deletedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name), asc(products.name))
      .limit(24);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category ?? null,
      price: r.price,
      unit: r.unit || "pcs",
      imageUrl: r.imageUrl ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const menuItems = await getLandingMenu();
  return <LandingPage menuItems={menuItems} />;
}
