import "server-only";

/** Supabase/Postgres hatasını kullanıcıya gösterilebilir Türkçe bir sebebe çevirir. */
export function explainDbError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return "bilinmeyen hata";
  const code = err.code ?? "";
  const msg = err.message ?? "";
  if (code === "42P01" || code === "PGRST205" || /does not exist|Could not find the table/i.test(msg)) {
    return "veritabanında tablo yok; supabase/schema.sql dosyasını Supabase'de tekrar çalıştır";
  }
  if (code === "PGRST204" || code === "42703") return "veritabanı eski; supabase/schema.sql dosyasını tekrar çalıştır";
  if (code === "42501" || /permission denied/i.test(msg)) {
    return "veritabanı izni yok; schema.sql'i tekrar çalıştır ve Vercel'deki SUPABASE_SERVICE_ROLE_KEY'in service_role (secret) anahtarı olduğunu kontrol et";
  }
  if (/Invalid API key|JWT|apikey/i.test(msg)) return "Vercel'deki SUPABASE_SERVICE_ROLE_KEY geçersiz";
  return `${code ? `${code}: ` : ""}${msg}`.slice(0, 200);
}
