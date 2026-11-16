import { NextResponse } from "next/server";

export const runtime = "nodejs";

// QR ordering context removed; QR codes are static website links to /search.
export async function GET() { return NextResponse.json({ ok: true, context: { mode: "direct" } }); }
export async function DELETE() { return NextResponse.json({ ok: true }); }
