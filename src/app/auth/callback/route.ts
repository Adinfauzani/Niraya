import { createSupabaseServerClient } from "@/server/auth/supabase";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { businesses, stores, businessMembers, userProfiles } from "@/server/db/schema";
import { slugify } from "@/lib/utils";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      const userId = data.user.id;
      const userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User";

      // Check if user already has owner membership (skip if exists)
      const existingMembership = await db.query.businessMembers.findFirst({
        where: and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.role, "owner"),
          eq(businessMembers.status, "active")
        ),
      });

      if (!existingMembership) {
        // Auto-create business, store, and membership
        try {
          const baseSlug = slugify(userName);
          let slug = baseSlug;
          let counter = 0;

          while (true) {
            const existing = await db.query.businesses.findFirst({
              where: eq(businesses.slug, slug),
            });
            if (!existing) break;
            counter++;
            slug = `${baseSlug}-${counter}`;
          }

          // Create business
          const newBusiness = await db
            .insert(businesses)
            .values({
              name: `${userName}'s Business`,
              slug,
              ownerUserId: userId,
              status: "active",
            })
            .returning({ id: businesses.id });

          const businessId = newBusiness[0].id;

          // Create store
          const newStore = await db
            .insert(stores)
            .values({
              businessId,
              name: `${userName}'s Store`,
              code: "MAIN",
              isActive: true,
            })
            .returning({ id: stores.id });

          const storeId = newStore[0].id;

          // Create owner membership
          await db.insert(businessMembers).values({
            businessId,
            userId,
            role: "owner",
            storeId,
            status: "active",
            joinedAt: new Date(),
          });

          // Update user profile with name if not set
          const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.id, userId),
          });

          if (profile && !profile.name) {
            await db
              .update(userProfiles)
              .set({ name: userName, updatedAt: new Date() })
              .where(eq(userProfiles.id, userId));
          }
        } catch (e) {
          console.error("Auto-create business error:", e);
          // Don't fail auth, user can create manually later
        }
      }

      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}