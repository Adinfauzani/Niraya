import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

export async function createUser(email: string, password: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return data.user;
}

export async function updateUserRole(userId: string, role: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) throw error;
  return data.user;
}

export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
}