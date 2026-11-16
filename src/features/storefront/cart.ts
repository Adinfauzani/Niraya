export type CartLine = {
  key: string
  productId: string
  variantId?: string | null
  name: string
  variantName?: string | null
  quantity: number
  unitPrice: number
  notes?: string
}

export const CART_KEY = "niraya_storefront_cart"
export const IDEM_KEY = "niraya_storefront_idem"
export const MAX_QTY = 99

export function cartStorageKey(storeId?: string | null) {
  return storeId ? `${CART_KEY}:${storeId}` : CART_KEY
}

export function idemStorageKey(storeId?: string | null) {
  return storeId ? `${IDEM_KEY}:${storeId}` : IDEM_KEY
}

export function cartKey(
  productId: string,
  variantId?: string | null,
  notes?: string,
) {
  return `${productId}:${variantId || ""}:${(notes || "").trim().toLowerCase()}`
}

export function loadCart(key: string): CartLine[] {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CartLine[]) : []
  } catch {
    return []
  }
}

export function saveCart(key: string, cart: CartLine[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(cart))
  } catch {}
}

export function clearCart(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {}
}

export function getOrCreateIdemKey(key: string) {
  let value = sessionStorage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    sessionStorage.setItem(key, value)
  }
  return value
}

export function clearIdemKey(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {}
}