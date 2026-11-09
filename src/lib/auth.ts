import { createSupabaseServerClient } from "@/server/auth/supabase";

export async function getSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}