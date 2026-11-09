import { createSupabaseServerClient } from "@/server/auth/supabase";

export async function getSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}