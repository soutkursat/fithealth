# Yedekler

GitHub Actions her pazar gecesi (`.github/workflows/yedek.yml`) Supabase'deki
önemli verileri yedekler, **senin parolanla şifreler** ve deponun
**Releases → "Veri yedekleri"** sayfasına `yedek-YYYY-MM-DD.json.gz.enc`
olarak yükler. Depo herkese açık olduğu için yedekler şifresiz asla konmaz.

## Bir yedeği geri yüklemek

1. Releases → "Veri yedekleri" sayfasından istediğin `yedek-….json.gz.enc` dosyasını indir.
2. Bilgisayarda (macOS/Linux terminali ya da Windows'ta Git Bash) çöz:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in yedek-2026-10-11.json.gz.enc -out yedek.json.gz
   gunzip yedek.json.gz          # → yedek.json (okunabilir JSON)
   ```
   Parola: GitHub'a `BACKUP_PASSWORD` olarak girdiğin parola.
3. SQL'e çevir: `node scripts/yedek/geri-yukle.mjs yedek.json > geri-yukle.sql`
4. Supabase → SQL Editor'a `supabase/schema.sql` (gerekirse) ve ardından `geri-yukle.sql` içeriğini yapıştırıp çalıştır.
   Var olan kayıtlara dokunulmaz, sadece eksikler geri eklenir.
