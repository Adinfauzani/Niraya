/** URL-safe slug derived from a store name (lowercase, non-alphanumerics -> "-"). */
export function slugifyStoreName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}