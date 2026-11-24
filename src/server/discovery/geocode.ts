/**
 * Reverse geocoding via OpenStreetMap Nominatim (free, no API key).
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * - Max ~1 request/second; a valid User-Agent identifying the app is required.
 * - No heavy/autocomplete use. Results are cached in-memory here to stay modest.
 *
 * The browser Geolocation API only yields numeric lat/lng; this converts a
 * coordinate into a human label such as "Gunung Putri, Kabupaten Bogor".
 */

const NOMINATIM_ENDPOINT =
  process.env.NOMINATIM_ENDPOINT?.trim() || "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT?.trim() || "NirayaPOS/0.1 (store locator reverse-geocoding)";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MIN_INTERVAL_MS = 1100; // respect the ~1 req/sec policy

const cache = new Map<string, { label: string | null; expiresAt: number }>();
let lastRequestAt = 0;

type NominatimAddress = Record<string, string | undefined>;

/**
 * Build a short label that surfaces the most local area (kelurahan/kecamatan)
 * plus its city/regency for context. Indonesian Nominatim data is inconsistent:
 * in Jakarta the kecamatan lands in `suburb` while the city is in `city_district`
 * (e.g. "Cipayung, Jakarta Timur"); in Bogor it is `town` + `county`
 * (e.g. "Nagrak, Gunung Putri").
 */
function buildLabel(address: NominatimAddress | undefined): string | null {
  if (!address) return null;

  const local =
    address.neighbourhood ||
    address.quarter ||
    address.suburb ||
    address.village ||
    address.hamlet ||
    undefined;

  const cityish =
    address.city_district ||
    address.city ||
    address.town ||
    address.municipality ||
    address.county ||
    undefined;

  const parts = [local, cityish]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

  return parts.length ? parts.slice(0, 2).join(", ") : null;
}

/**
 * Resolve lat/lng to a place label. Returns null when the coordinate is invalid,
 * the lookup fails, or no label can be derived. Throttled and cached.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  // Round to ~100m precision so nearby points share a cache entry.
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.label;

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  try {
    lastRequestAt = Date.now();
    const url = `${NOMINATIM_ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cache.set(cacheKey, { label: null, expiresAt: Date.now() + 60_000 });
      return null;
    }
    const data = (await res.json()) as { address?: NominatimAddress };
    const label = buildLabel(data?.address);
    cache.set(cacheKey, { label, expiresAt: Date.now() + CACHE_TTL_MS });
    return label;
  } catch {
    return null;
  }
}