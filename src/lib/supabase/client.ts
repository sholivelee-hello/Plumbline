import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const isConfigured =
  SUPABASE_URL.length > 0 &&
  !SUPABASE_URL.includes("your-project") &&
  SUPABASE_KEY.length > 0 &&
  !SUPABASE_KEY.includes("your-anon-key");

export function isSupabaseConfigured() {
  return isConfigured;
}

export function createClient() {
  if (!isConfigured) {
    // Return a proxy that throws on any table access, triggering catch blocks → demo data
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        if (prop === "auth") {
          return {
            getUser: async () => ({ data: { user: null }, error: new Error("Not configured") }),
            signUp: async () => ({ data: null, error: new Error("Not configured") }),
            signInWithPassword: async () => ({ data: null, error: new Error("Not configured") }),
            signOut: async () => ({ error: null }),
          };
        }
        if (prop === "from") {
          return () => ({
            select: () => { throw new Error("Supabase not configured"); },
            insert: () => { throw new Error("Supabase not configured"); },
            update: () => { throw new Error("Supabase not configured"); },
            delete: () => { throw new Error("Supabase not configured"); },
          });
        }
        return undefined;
      },
    });
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
