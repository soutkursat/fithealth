# 🐺 Kurt Giderek Azalıyor

Kişisel kilo verme takibi. Sen telefondan girersin, çevren siteden izler.

```
 Telefon (Health Connect)             Telefon (tarayıcı / ana ekran)
   │ yakılan kalori, adım, kilo          │ barkod okut, yemek ekle, kilo gir
   ▼                                     ▼
 Kurt Köprü (Android APK) ──▶ /api/sync   /admin (şifreli panel)
                                  │         │
                                  ▼         ▼
                           Supabase (ücretsiz Postgres)
                                  │
                                  ▼
                       Herkese açık site  ( / , /gecmis , /gun/… )
```

| Klasör | Ne |
|---|---|
| `web/` | Next.js sitesi: herkese açık pano + `/admin` paneli + API |
| `android/` | Health Connect'ten okuyup siteye gönderen küçük köprü uygulaması |
| `supabase/` | Veritabanı şeması ve temel besin listesi |

Hepsi **ücretsiz** planlarla çalışır: Supabase Free, Vercel Hobby, GitHub Actions.

---

## Barkod ve besin veritabanları

Barkod okutunca sırasıyla şunlara bakılır. Bulunan ürün kendi veritabanına kaydedilir, bir sonraki okutmada anında gelir.

1. **Kendi veritabanın**: daha önce okuttukların ve elle eklediklerin
2. **Open Food Facts**: ücretsiz, anahtar istemez, Türk ürünleri de var
3. **USDA FoodData Central**: ücretsiz. Anahtar girmezsen `DEMO_KEY` kullanılır (saatte 30 istek); [ücretsiz anahtar al](https://fdc.nal.usda.gov/api-key-signup)
4. **Edamam**: isteğe bağlı, ücretsiz geliştirici anahtarı ister
5. **UPCitemdb**: sadece ürün adı ve marka verir, formu doldurmana yardım eder

Hiçbirinde yoksa ambalajdaki değerleri bir kez girersin (100 g başına ya da porsiyon başına) ve kaydedilir. Arama kutusu da Open Food Facts'te, USDA'da, kendi kayıtlarında ve `seed_temel_besinler.sql` içindeki ~50 yaygın Türk yiyeceğinde (simit, mercimek çorbası, lahmacun…) arar.

---

## Kurulum (bir kerelik, ~20 dk)

### 1. Supabase (veritabanı)

1. <https://supabase.com> → ücretsiz hesap → **New project** (bölge: Frankfurt / `eu-central-1`).
2. **SQL Editor → New query** → `supabase/schema.sql` dosyasının tamamını yapıştır → **Run**.
3. Aynısını `supabase/seed_temel_besinler.sql` için yap.
4. **Authentication → Users → Add user → Create new user**: kendi e-postan ve bir şifre (“Auto confirm user” işaretli).
5. Kendini yönetici yap. SQL Editor'da e-postanı yazarak çalıştır:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'senin@epostan.com';
   ```
6. **Authentication → Sign In / Providers → “Allow new users to sign up”** seçeneğini **kapat**. Böylece başkası hesap açamaz.
7. **Project Settings → API**: `Project URL`, `anon` (publishable) ve `service_role` (secret) anahtarlarını bir kenara not et.

> Supabase'in ücretsiz projesi 1 hafta hiç kullanılmazsa duraklatılır. Köprü uygulaması her saat veri gönderdiği için bu olmaz.

### 2. Vercel (site)

1. <https://vercel.com> → GitHub ile giriş → **Add New → Project** → bu depoyu seç.
2. **Root Directory**: `web`
3. **Environment Variables** (`web/.env.example` dosyasına bak):

   | Değişken | Değer |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable anahtar |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret anahtar (**kimseyle paylaşma**) |
   | `SYNC_TOKEN` | uzun rastgele bir metin, örn. `openssl rand -hex 32` çıktısı |
   | `USDA_API_KEY` | isteğe bağlı |

4. **Deploy**. Site adresin `https://<proje>.vercel.app` gibi olacak; bunu çevrenle paylaş.

### 3. Telefonda panel (barkod ve yemek girişi)

1. Telefonda Chrome ile `https://<site>/admin` adresini aç ve giriş yap.
2. Menü (⋮) → **Ana ekrana ekle**. Artık uygulama gibi açılır.
3. **📷 Barkod okut** ilk kullanımda kamera izni ister.

Panelde dört sekme var: **Ekle** (barkod, arama, yeni ürün, hızlı kalori, son yediklerin), **Gün** (kayıtlar ve silme), **Kilo**, **Ayarlar** (günlük kalori hedefi, başlangıç ve hedef kilo).

### 4. Android köprü uygulaması (Health Connect)

1. Bu depoda **Actions → Android APK** iş akışı her `android/` değişikliğinde APK üretir.
   Ana dalda **Releases → “Kurt Köprü (Android)”** sayfasına `kurt-kopru.apk` olarak da yüklenir; telefondan oradan indir.
   (Ana dal dışında: Actions → son çalışma → **Artifacts → kurt-kopru-apk**.)
2. APK'yı aç, “bilinmeyen kaynaklardan yükleme” izni ver ve kur.
3. Uygulamada:
   - **İzinleri ver** → Health Connect'te tüm izinleri aç (özellikle **arka planda erişim**).
   - **Site adresi**: `https://<site>.vercel.app`
   - **Senkron anahtarı**: Vercel'e girdiğin `SYNC_TOKEN`
   - **Kaydet**. İlk senkron hemen yapılır, sonra saatte bir otomatik devam eder.
4. Samsung Health, Google Fit, Mi Fitness, Garmin gibi uygulamalarda **Health Connect ile paylaşım** açık olmalı.
   Köprü sadece Health Connect'e yazılmış veriyi görebilir.
5. Pil ayarlarında “Kurt Köprü” için **Kısıtlanmamış** seç; arka plan senkronu daha düzenli çalışır.

Gönderilenler: günlük **toplam** ve **aktif** yakılan kalori, **adım**, **mesafe**, **kilo** (akıllı tartın Health Connect'e yazıyorsa). Elle girdiğin kilo, telefondan gelenle ezilmez.

#### “Her gün ~2000 kcal yakmışım gibi görünüyor”

Health Connect, hiçbir uygulama ona gerçek kalori verisi yazmadığında **toplam kaloriyi kendisi tahmin eder**. Bu tahmin sadece dinlenme (bazal) kalorisidir ve her gün aşağı yukarı aynı çıkar.

- Köprü uygulaması artık bu günleri göndermiyor. Sitede tahmini değerler `~` ile gri gösteriliyor ve kalori dengesine katılmıyor.
- Uygulamadaki **“Kaynak:”** satırı veriyi hangi uygulamanın yazdığını gösterir. “yok” ya da sadece “Health Connect” yazıyorsa saat/bileklik uygulamanda (Samsung Health, Mi Fitness, Fitbit…) **Health Connect → izinler → “Aktif kalori” / “Toplam kalori” yazma** iznini aç.
- Tahminin gerçeğe yakın olması için Health Connect'te boy ve kilonun kayıtlı olması iyi olur.
- Eski hatalı kayıtları temizlemek için Supabase SQL Editor'da `truncate public.daily_activity;` çalıştır, sonra uygulamada **Şimdi senkronla (30 gün)** düğmesine bas.

#### APK güncellemeleri (isteğe bağlı)

Varsayılan olarak her derleme farklı bir debug anahtarıyla imzalanır. Bu yüzden yeni sürümü kurmadan önce eskisini silmen gerekir (silince sadece site adresi ve anahtarı tekrar girersin).
Güncellemelerin üstüne kurulmasını istersen bir kez anahtar oluştur ve GitHub'a ekle:

```bash
keytool -genkeypair -v -keystore kurt.jks -alias kurt -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 kurt.jks   # çıktıyı kopyala
```

Depo → **Settings → Secrets and variables → Actions** altında şunları ekle: `KEYSTORE_BASE64` (base64 çıktısı), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`kurt`), `KEY_PASSWORD`. `kurt.jks` dosyasını depoya **koyma**.

---

## Sitede neler var

- **Ana sayfa** (`/`): güncel kilo halkası, eriyen kilo, Kızılelma'ya (hedefe) kalan yol, **Kurt'a motivasyon yükle** butonu (kızgın kurt efekti + sayaç), **Kurt'a bir not gönder** formu (üyeliksiz), bugünün raporu, etkileşimli kalori grafiği (günün hesabı / yenilen-yakılan, 7-14-30 gün, güne dokununca açıklama), kilo seyri, açılır kapanır son 7 gün kartları
- **Geçmiş** (`/gecmis`) ve **gün detayı** (`/gun/2026-10-08`)

## Yönetim paneli (`/admin`)

- **Karargâh:** öfke seviyesi (bugün kaç kez motive edildin), hedef kilo / günlük kalori sınırı / sitedeki sözün, gelen notlar (okundu, sitede gizle, sil). Yeni not ya da motivasyon gelince açılır bildirim penceresi çıkar (30 saniyede bir kontrol).
- **Tarih seçici:** üstteki tarihe dokunup **6 aya kadar geriye** gidebilirsin; yemek, kilo ve yakılan kalori o güne girilir.
- **Gün → Yakılan kalori:** telefondan gelen veri sadece gösterilir, değiştirilmez. Elle girdiklerin ayrı tutulur:
  - *Ek aktivite* (telefonun görmediği spor vb.) toplama eklenir.
  - *Günlük toplam* sadece telefondan gerçek veri gelmeyen günlerde kullanılır.

> Bu özellikler için `supabase/schema.sql` dosyasını Supabase SQL Editor'da **bir kez daha** çalıştır. Var olan veriler silinmez.

## Kızılelma tahmini, su ve protein

- **"Bu hızla Kızılelma'ya ne zaman?"**: Son 6 haftanın tartılarına doğrusal bir eğilim çizgisi oturtulur (en az 3 tartı, en az 7 gün aralık). Tartı yetmezse son 2 haftanın kalori hesabı kullanılır (7700 kcal ≈ 1 kg). Kilo grafiğinde mavi kesikli çizgi olarak da görünür.
- **Su:** Panelde Ekle ve Gün sekmelerinde "+1 bardak (250 ml)" ve "+½ litre" düğmeleri, ↶ ile son kaydı geri alma.
- **Protein:** Yediklerinden otomatik toplanır.
- Hedefler (su ml, protein g) Karargâh → Hedefler'den değişir.

## Yedekleme (haftalık, şifreli)

Supabase'in ücretsiz planı otomatik yedek almaz. Bu depoda her pazar gecesi çalışan bir GitHub Actions görevi var
(`.github/workflows/yedek.yml`). Verileri indirir, **senin parolanla AES-256 ile şifreler** ve
**Releases → "Veri yedekleri"** sayfasına yükler. Son 26 yedek (~6 ay) saklanır. Depo herkese açık olduğu için şifresiz yedek asla konmaz.

**Kurulum (bir kerelik):** Depo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Değer |
|---|---|
| `SUPABASE_URL` | Supabase Project URL (Vercel'deki `NEXT_PUBLIC_SUPABASE_URL` ile aynı) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel'deki ile aynı service_role anahtarı |
| `BACKUP_PASSWORD` | Uzun bir parola. **Bunu kaybedersen yedekler açılamaz**, bir yere not et. |

Sonra **Actions → Veri yedeği → Run workflow** ile ilk yedeği hemen al. Geri yükleme adımları: [`scripts/yedek/README.md`](scripts/yedek/README.md).

## Yerelde çalıştırma

```bash
cd web
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev                  # http://localhost:3000
```

Android: `android/` klasörünü Android Studio ile aç ve çalıştır.

## API: `/api/sync`

```http
POST /api/sync
Authorization: Bearer <SYNC_TOKEN>
Content-Type: application/json

{
  "days":    [{ "date": "2026-10-08", "activeKcal": 512, "totalKcal": 2480, "steps": 9120, "distanceM": 6800 }],
  "weights": [{ "date": "2026-10-08", "kg": 92.4 }]
}
```

Aynı gün tekrar gönderilirse üzerine yazılır.
