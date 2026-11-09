import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { userProfiles, roles } from "@/server/db/schema";
import { getSession } from "@/lib/auth";

/**
 * Role aplikasi. `user` adalah role dasar untuk setiap akun yang login,
 * sedangkan role lain adalah role operasional yang diberikan secara eksplisit.
 */
export type UserRole = "user" | "owner" | "admin" | "manager" | "cashier";

/** Role bawaan untuk akun yang baru login / belum punya profil. */
export const DEFAULT_ROLE: UserRole = "user";

const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  cashier: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

const ROLE_VALUES = Object.keys(ROLE_RANK) as UserRole[];

/** Pastikan nilai role dari database valid; jika tidak, pakai role default. */
export function normalizeRole(value: unknown): UserRole {
  return typeof value === "string" && ROLE_VALUES.includes(value as UserRole)
    ? (value as UserRole)
    : DEFAULT_ROLE;
}

/**
 * Cek apakah role pengguna memenuhi role yang dibutuhkan (atau lebih tinggi).
 */
export function hasRole(userRole: UserRole | undefined, required: UserRole) {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Pastikan akun yang login punya baris di `core.UserProfiles`. Akun baru
 * otomatis mendapat role dasar `user`, bukan role operasional.
 * Supabase Auth user ID is UUID, matches UserProfiles.Id (FK to auth.users).
 */
export async function ensureUserProfile(user: SessionUser | null) {
  if (!user?.id) return null;

  const supabaseUserId = String(user.id);

  const [existing] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, supabaseUserId))
    .limit(1);

  if (existing) return existing;

  // Pastikan role 'user' ada di tabel Roles untuk memenuhi foreign key
  await db
    .insert(roles)
    .values({
      code: "user",
      name: "User",
      description: "Akun dasar",
      rank: 0,
      isSystem: true,
    })
    .onConflictDoNothing();

  const [created] = await db
    .insert(userProfiles)
    .values({
      id: supabaseUserId,
      name: user.name ?? null,
      email: user.email ?? null,
      role: DEFAULT_ROLE,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Bisa terjadi race saat dua request pertama datang bersamaan.
  const [fallback] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, supabaseUserId))
    .limit(1);

  return fallback ?? null;
}

function readSessionUser(session: unknown): SessionUser | null {
  const value = session as
    | { user?: SessionUser; data?: { user?: SessionUser } }
    | null;
  return value?.user ?? value?.data?.user ?? null;
}

/**
 * Ambil role pengguna saat ini dari sesi Supabase Auth + tabel `core.UserProfiles`.
 * Profil dibuat otomatis dengan role `user` jika belum ada.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const session = await getSession();
  const user = readSessionUser(session);

  if (!user?.id) return DEFAULT_ROLE;

  const profile = await ensureUserProfile(user);
  return normalizeRole(profile?.role);
}

/**
 * Pastikan pengguna saat ini memiliki role yang cukup. Lempar jika tidak.
 */
export async function requireRole(required: UserRole): Promise<UserRole> {
  const role = await getCurrentUserRole();
  if (!hasRole(role, required)) {
    const err: any = new Error("Akses ditolak: role tidak cukup.");
    err.status = 403;
    throw err;
  }
  return role;
}

/**
 * Role minimum yang diperlukan per aksi bisnis.
 */
export const ACTION_ROLES: Record<string, UserRole> = {
  // Kategori
  "category.create": "manager",
  "category.update": "manager",
  "category.delete": "owner",
  // Produk
  "product.create": "manager",
  "product.update": "manager",
  "product.status": "manager",
  "product.delete": "owner",
  // Pelanggan
  "customer.create": "manager",
  "customer.update": "manager",
  "customer.delete": "owner",
  // Staf operasional (tabel staff)
  "staff.create": "admin",
  "staff.update": "admin",
  "staff.delete": "owner",
  // User login/app profile roles (core.UserProfiles). Admin can assign; owner protects last-owner.
  "user.role.update": "admin",
  "user.profile.delete": "admin",
  // Stok
  "stock.adjust": "manager",
  // Toko
  "store.create": "owner",
  "store.update": "admin",
  "store.delete": "owner",
  // QR ordering
  "qr.manage": "manager",
  "qr.payment.verify": "manager",
  "qr.order.manage": "cashier",
  // Transaksi
  "transaction.void": "manager",
  // Pengaturan
  "settings.update": "admin",
  // Demo/Presentasi
  "demo.seed": "owner",
};
