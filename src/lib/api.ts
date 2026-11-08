"use client"

import type {
  BusinessSettings,
  Category,
  Customer,
  Product,
  Staff,
  StockMovement,
  Transaction,
} from "@/types/business"

export type BusinessData = {
  categories: Category[]
  products: Product[]
  customers: Customer[]
  staff: Staff[]
  transactions: Transaction[]
  movements: StockMovement[]
  /** `null` means business settings are not initialized yet. */
  settings: BusinessSettings | null
  settingsState?: "ready" | "uninitialized"
}

export type ApiErrorPayload = {
  error?: string
  code?: string
  details?: unknown
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? ""
  return contentType.includes("application/json")
}

async function readApiPayload<T>(response: Response): Promise<T | null> {
  if (response.status === 204) return null
  const text = await response.text().catch(() => "")
  if (!text) return null
  if (!isJsonResponse(response)) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function apiError(response: Response, payload: ApiErrorPayload | null, fallback: string): Error & { status?: number; code?: string } {
  const message =
    (payload?.error && typeof payload.error === "string" ? payload.error : null) ||
    (response.status === 401 ? "Sesi berakhir. Silakan masuk kembali." : null) ||
    (response.status === 403 ? "Akses tidak diizinkan." : null) ||
    (response.status === 404 ? "Data tidak ditemukan." : null) ||
    fallback
  const error = new Error(message) as Error & { status?: number; code?: string }
  error.status = response.status
  if (payload?.code) error.code = payload.code
  return error
}

function normalizeBusinessData(payload: Partial<BusinessData> | null): BusinessData {
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    products: Array.isArray(payload?.products) ? payload.products : [],
    customers: Array.isArray(payload?.customers) ? payload.customers : [],
    staff: Array.isArray(payload?.staff) ? payload.staff : [],
    transactions: Array.isArray(payload?.transactions) ? payload.transactions : [],
    movements: Array.isArray(payload?.movements) ? payload.movements : [],
    settings: payload?.settings && typeof payload.settings === "object" ? payload.settings : null,
    settingsState: payload?.settings && typeof payload.settings === "object" ? "ready" : "uninitialized",
  }
}

export async function fetchBusinessData(): Promise<BusinessData> {
  const response = await fetch("/api/business", {
    cache: "no-store",
    credentials: "include",
  })
  const payload = await readApiPayload<BusinessData & ApiErrorPayload>(response)
  if (!response.ok) {
    throw apiError(response, payload, "Gagal memuat data bisnis.")
  }
  return normalizeBusinessData(payload)
}

export async function mutateBusiness(action: string, payload: unknown) {
  const response = await fetch("/api/business", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    credentials: "include",
  })
  const data = await readApiPayload<{ ok?: boolean } & ApiErrorPayload>(response)
  if (!response.ok) {
    throw apiError(response, data, "Gagal menyimpan data.")
  }
  return data ?? { ok: true }
}

export type CheckoutPayload = {
  idempotencyKey: string
  items: { productId: string; quantity: number }[]
  paymentMethod: "cash" | "card" | "qris"
  paymentAmount?: number
  customerId?: string
  customerName?: string
  orderType: "dine-in" | "takeaway"
  tableNumber?: string
  discount: number
  tax: number
  cashier?: string
}

export async function fetchCheckout(payload: CheckoutPayload) {
  const response = await fetch("/api/pos/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  })

  const data = await readApiPayload<unknown & ApiErrorPayload>(response)
  if (!response.ok) {
    throw apiError(response, data, "Checkout gagal.")
  }
  return data ?? {}
}

export type LoginUserRow = {
  profileId: string
  userId: string
  name: string
  email: string
  role: "user" | "cashier" | "manager" | "admin" | "owner"
  createdAt: string | null
  updatedAt: string | null
}

export async function fetchLoginUsers(): Promise<LoginUserRow[]> {
  const response = await fetch("/api/staff/users", { cache: "no-store", credentials: "include" })
  const payload = await readApiPayload<{ users?: LoginUserRow[] } & ApiErrorPayload>(response)
  if (!response.ok) throw apiError(response, payload, "Gagal memuat pengguna login.")
  return Array.isArray(payload?.users) ? payload.users : []
}

export async function updateLoginUserRole(userId: string, role: LoginUserRow["role"]) {
  const response = await fetch("/api/staff/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, role }),
  })
  const payload = await readApiPayload<{ ok?: boolean } & ApiErrorPayload>(response)
  if (!response.ok) throw apiError(response, payload, "Gagal memperbarui role.")
  return payload
}

export async function removeLoginUserProfile(userId: string) {
  const response = await fetch("/api/staff/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId }),
  })
  const payload = await readApiPayload<{ ok?: boolean } & ApiErrorPayload>(response)
  if (!response.ok) throw apiError(response, payload, "Gagal menghapus profil pengguna.")
  return payload
}
