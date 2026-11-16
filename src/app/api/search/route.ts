import { createFromSource } from "fumadocs-core/search/server"

import { source } from "@/lib/docs-source"

export const runtime = "nodejs";

export const revalidate = false

const search = createFromSource(source)

export function GET(request: Request) {
  return search.GET(request)
}