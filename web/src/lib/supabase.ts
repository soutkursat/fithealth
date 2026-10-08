import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

let publicClient: SupabaseClient | null = null;

/** Read-only client for public pages (no session persisted). */
export function getPublicClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error("Supabase ortam değişkenleri eksik");
  publicClient ??= createClient(url, anonKey, { auth: { persistSession: false } });
  return publicClient;
}

let browserClient: SupabaseClient | null = null;

/** Browser client for the admin panel (session kept in localStorage). */
export function getBrowserClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error("Supabase ortam değişkenleri eksik");
  browserClient ??= createClient(url, anonKey);
  return browserClient;
}
