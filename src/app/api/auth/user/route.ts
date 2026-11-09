import { createSupabaseServerClient } from "@/server/auth/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}