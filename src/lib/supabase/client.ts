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

function makeNoopQueryBuilder() {
  const resolved = Promise.resolve({ data: null, error: null });
  const builder: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return resolved.then.bind(resolved);
        if (prop === "catch") return resolved.catch.bind(resolved);
        if (prop === "finally") return resolved.finally.bind(resolved);
        // Any chainable method returns the same builder (supports select, insert, upsert, eq, .maybeSingle(), etc.)
        return () => builder;
      },
    }
  );
  return builder;
}

export function createClient() {
  if (!isConfigured) {
    // Return a permissive proxy: chains succeed with null data, so UI can still be explored
    // without a live Supabase backend. Real saves silently no-op.
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        if (prop === "auth") {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            signUp: async () => ({ data: null, error: new Error("Not configured") }),
            signInWithPassword: async () => ({ data: null, error: new Error("Not configured") }),
            signOut: async () => ({ error: null }),
          };
        }
        if (prop === "from") {
          return () => makeNoopQueryBuilder();
        }
        return undefined;
      },
    });
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
