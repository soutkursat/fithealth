import { getAdminClient } from "@/lib/supabase-admin";
import { sinceIso, visitorHash } from "@/lib/visitor";

/** "Kurt'a motivasyon yükle!" tıklaması. */
export async function POST(req: Request) {
  const supabase = getAdminClient();
  const ip_hash = visitorHash(req);
  const { count } = await supabase
    .from("motivations")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("created_at", sinceIso(60));
  let saved = false;
  if ((count ?? 0) < 30) {
    const { error } = await supabase.from("motivations").insert({ ip_hash });
    saved = !error;
  }
  const { data } = await supabase.rpc("motivation_counts");
  const d = (data ?? {}) as { today?: number; total?: number };
  return Response.json({ ok: true, saved, today: Number(d.today ?? 0), total: Number(d.total ?? 0) });
}
