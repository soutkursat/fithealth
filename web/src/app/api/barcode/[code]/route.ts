import { bearer, getAdminClient, isAdminToken } from "@/lib/supabase-admin";
import { isValidBarcode, lookupBarcodeExternal } from "@/lib/food-sources";

export async function GET(req: Request, ctx: RouteContext<"/api/barcode/[code]">) {
  if (!(await isAdminToken(bearer(req)))) {
    return Response.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { code } = await ctx.params;
  if (!isValidBarcode(code)) {
    return Response.json({ error: "Geçersiz barkod" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: local } = await supabase.from("products").select("*").eq("barcode", code).maybeSingle();
  if (local) return Response.json({ status: "found", product: { ...local, source: local.source } });

  const external = await lookupBarcodeExternal(code);
  if (!external) return Response.json({ status: "not_found", product: null });
  if (external.kcal_100g == null) return Response.json({ status: "partial", product: external });

  // Bulunan ürünü önbelleğe al, bir dahaki okutmada anında gelsin.
  const { data: saved } = await supabase
    .from("products")
    .upsert({ ...external, barcode: code }, { onConflict: "barcode" })
    .select("*")
    .single();
  return Response.json({ status: "found", product: saved ?? external });
}
