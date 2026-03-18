import { createClient } from "@supabase/supabase-js";

// Use proxy URL if set (bypasses ISP blocks), otherwise use direct Supabase URL
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_PROXY_URL as string | undefined
  || (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL (or VITE_SUPABASE_PROXY_URL) and VITE_SUPABASE_ANON_KEY");
}

export const SUPABASE_URL = supabaseUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
