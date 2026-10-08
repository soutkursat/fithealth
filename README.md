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

- **Bugün** (`/`): kaybedilen kilo, hedefe ilerleme, alınan, harcanan ve denge (açık/fazla), kalan kalori hakkı, adım, makro dağılımı, öğün öğün yenilenler, son 14 günün kalori grafiği, kilo grafiği, son 7 gün tablosu
- **Geçmiş** (`/gecmis`): tüm günler, ortalamalar, toplam kalori açığı ve bunun kabaca kaç kg yağa denk geldiği (7700 kcal ≈ 1 kg)
- **Gün detayı** (`/gun/2026-10-08`): o günün tüm kayıtları

Telefon, tablet ve masaüstüne uyumlu; açık ve koyu temayı cihaz ayarına göre seçer.

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
