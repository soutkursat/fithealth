import { getAdminClient } from "@/lib/supabase-admin";
import { explainDbError } from "@/lib/db-errors";

/**
 * Kurulum kontrolü: tarayıcıda /api/durum adresini aç.
 * Gizli bilgi göstermez; sadece neyin eksik olduğunu söyler.
 */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SYNC_TOKEN: Boolean(process.env.SYNC_TOKEN),
  };
  const tables: Record<string, string> = {};
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = getAdminClient();
    for (const t of ["settings", "food_logs", "daily_activity", "weights", "manual_burns", "manual_day_totals", "notes", "motivations"]) {
      const { error } = await supabase.from(t).select("*").limit(1);
      tables[t] = error ? `HATA: ${explainDbError(error)}` : "tamam";
    }
    const { error: rpcError } = await supabase.rpc("motivation_counts");
    tables["motivation_counts()"] = rpcError ? `HATA: ${explainDbError(rpcError)}` : "tamam";
  }
  const ok = Object.values(env).every(Boolean) && Object.values(tables).every((v) => v === "tamam");
  return Response.json({ ok, env, tables }, { headers: { "Cache-Control": "no-store" } });
}
