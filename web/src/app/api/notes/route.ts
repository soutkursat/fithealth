import { getAdminClient } from "@/lib/supabase-admin";
import { sinceIso, visitorHash } from "@/lib/visitor";

/** Ziyaretçi notu: üyelik yok, sadece isim + mesaj. */
export async function POST(req: Request) {
  let body: { name?: unknown; message?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  // Bal küpü: botlar bu gizli alanı doldurur.
  if (typeof body.website === "string" && body.website.trim()) {
    return Response.json({ ok: true });
  }
  const clean = (v: unknown, max: number) =>
    typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
  const name = clean(body.name, 40);
  const message = typeof body.message === "string" ? body.message.replace(/\r\n/g, "\n").trim().slice(0, 500) : "";
  if (!name) return Response.json({ error: "Adını yazmayı unuttun, yiğidim." }, { status: 400 });
  if (!message) return Response.json({ error: "Boş not olmaz, iki satır gönder." }, { status: 400 });

  const supabase = getAdminClient();
  const ip_hash = visitorHash(req);
  const { count } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("created_at", sinceIso(600));
  if ((count ?? 0) >= 3) {
    return Response.json({ error: "Yavaş ol, kurt notları okuyor. Biraz sonra tekrar dene." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({ name, message, ip_hash })
    .select("id, name, message, created_at")
    .single();
  if (error) return Response.json({ error: "Not gönderilemedi." }, { status: 500 });
  return Response.json({ ok: true, note: data });
}
