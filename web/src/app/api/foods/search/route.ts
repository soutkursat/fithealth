import { bearer, getAdminClient, isAdminToken } from "@/lib/supabase-admin";
import { searchExternal } from "@/lib/food-sources";
import type { Product } from "@/lib/types";

export async function GET(req: Request) {
  if (!(await isAdminToken(bearer(req)))) {
    return Response.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const withExternal = url.searchParams.get("external") !== "0";
  if (q.length < 2) return Response.json({ local: [], external: [] });

  const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const [localRes, external] = await Promise.all([
    getAdminClient()
      .from("products")
      .select("*")
      .or(`name.ilike.${JSON.stringify(pattern)},brand.ilike.${JSON.stringify(pattern)}`)
      .order("source", { ascending: true })
      .limit(20),
    withExternal ? searchExternal(q) : Promise.resolve([] as Product[]),
  ]);

  return Response.json({ local: localRes.data ?? [], external });
}
