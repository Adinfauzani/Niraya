"use client";

let supabaseClientInstance: any = null;

function createMockClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      exchangeCodeForSession: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: { message: "Supabase not configured" } }),
    },
  };
}

function getRealClient() {
  if (typeof window === "undefined") {
    // During SSR, return mock to avoid importing @supabase/ssr
    return createMockClient();
  }
  
  if (supabaseClientInstance) return supabaseClientInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    return createMockClient();
  }
  
  // Dynamic import to avoid SSR issues
  import("@supabase/ssr").then(({ createBrowserClient }) => {
    supabaseClientInstance = createBrowserClient(url, key);
  });
  
  // Return mock immediately, real client will be set asynchronously
  return createMockClient();
}

export const supabaseClient = {
  get auth() {
    return getRealClient().auth;
  },
};