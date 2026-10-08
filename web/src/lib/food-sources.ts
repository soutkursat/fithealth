import "server-only";
import type { Product } from "./types";

/**
 * Ücretsiz besin veritabanları. Barkod araması sırası:
 *   1. Kendi veritabanımız (önbellek + elle eklenenler)
 *   2. Open Food Facts   — ücretsiz, anahtarsız, Türk ürünleri dahil
 *   3. USDA FoodData Central — ücretsiz anahtar (yoksa DEMO_KEY)
 *   4. Edamam            — isteğe bağlı, ücretsiz geliştirici anahtarı
 *   5. UPCitemdb         — sadece ürün adı/marka verir (besin değeri yok)
 */

const UA = "KurtGiderekAzaliyor/1.0 (kisisel kilo takip uygulamasi)";
const TIMEOUT = 7000;

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const n = (v: unknown): number | null => {
  const x = typeof v === "string" ? Number.parseFloat(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : null;
};

const stripZeros = (code: string) => code.replace(/^0+/, "");

// ───────────────────────── Open Food Facts ─────────────────────────

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  generic_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  image_front_small_url?: string;
  image_url?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const OFF_FIELDS =
  "code,product_name,product_name_tr,generic_name,brands,serving_quantity,image_front_small_url,image_url,nutriments";

function fromOff(p: OffProduct, barcode?: string): Product | null {
  const name = (p.product_name_tr || p.product_name || p.generic_name || "").trim();
  const nu = p.nutriments ?? {};
  let kcalValue = n(nu["energy-kcal_100g"]);
  if (kcalValue == null) {
    const kj = n(nu["energy-kj_100g"] ?? nu["energy_100g"]);
    if (kj != null) kcalValue = Math.round(kj / 4.184);
  }
  if (!name) return null;
  return {
    barcode: barcode ?? p.code ?? null,
    name,
    brand: p.brands?.split(",")[0]?.trim() || null,
    kcal_100g: kcalValue,
    protein_100g: n(nu.proteins_100g),
    carbs_100g: n(nu.carbohydrates_100g),
    fat_100g: n(nu.fat_100g),
    sugar_100g: n(nu.sugars_100g),
    fiber_100g: n(nu.fiber_100g),
    salt_100g: n(nu.salt_100g),
    serving_g: n(p.serving_quantity),
    image_url: p.image_front_small_url || p.image_url || null,
    source: "openfoodfacts",
  };
}

async function offBarcode(code: string): Promise<Product | null> {
  const data = await getJson<{ status?: number; product?: OffProduct }>(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
  );
  if (!data?.product || data.status === 0) return null;
  return fromOff(data.product, code);
}

async function offSearch(q: string): Promise<Product[]> {
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "15",
    sort_by: "unique_scans_n",
    fields: OFF_FIELDS,
  });
  const data = await getJson<{ products?: OffProduct[] }>(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
  return (data?.products ?? []).map((p) => fromOff(p)).filter((p): p is Product => p != null && p.kcal_100g != null);
}

// ───────────────────────── USDA FoodData Central ─────────────────────────

type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: { nutrientId?: number; nutrientNumber?: string; value?: number; unitName?: string }[];
};

function fromUsda(f: UsdaFood): Product | null {
  const byId = new Map<number, number>();
  for (const x of f.foodNutrients ?? []) {
    if (x.nutrientId != null && x.value != null) byId.set(x.nutrientId, x.value);
  }
  // 1008 = Energy (kcal); 2047/2048 = Atwater energy (Foundation foods)
  const kcalValue = byId.get(1008) ?? byId.get(2047) ?? byId.get(2048) ?? null;
  if (kcalValue == null) return null;
  const sodiumMg = byId.get(1093);
  const unit = f.servingSizeUnit?.toLowerCase();
  return {
    barcode: f.gtinUpc ?? null,
    name: titleCase(f.description),
    brand: f.brandName || f.brandOwner || null,
    kcal_100g: Math.round(kcalValue),
    protein_100g: n(byId.get(1003)),
    carbs_100g: n(byId.get(1005)),
    fat_100g: n(byId.get(1004)),
    sugar_100g: n(byId.get(2000)),
    fiber_100g: n(byId.get(1079)),
    salt_100g: sodiumMg != null ? n((sodiumMg * 2.5) / 1000) : null,
    serving_g: unit === "g" || unit === "ml" || unit === "grm" ? n(f.servingSize) : null,
    image_url: null,
    source: "usda",
  };
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const usdaKey = () => process.env.USDA_API_KEY || "DEMO_KEY";

async function usdaSearchRaw(query: string, dataType: string, pageSize: number): Promise<UsdaFood[]> {
  const params = new URLSearchParams({ api_key: usdaKey(), query, pageSize: String(pageSize), dataType });
  const data = await getJson<{ foods?: UsdaFood[] }>(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`);
  return data?.foods ?? [];
}

async function usdaBarcode(code: string): Promise<Product | null> {
  const foods = await usdaSearchRaw(code, "Branded", 5);
  const hit = foods.find((f) => f.gtinUpc && stripZeros(f.gtinUpc) === stripZeros(code));
  const p = hit ? fromUsda(hit) : null;
  return p ? { ...p, barcode: code } : null;
}

async function usdaSearch(q: string): Promise<Product[]> {
  const foods = await usdaSearchRaw(q, "Foundation,SR Legacy,Branded", 10);
  return foods.map(fromUsda).filter((p): p is Product => p != null);
}

// ───────────────────────── Edamam (isteğe bağlı) ─────────────────────────

type EdamamFood = {
  label: string;
  brand?: string;
  image?: string;
  nutrients?: { ENERC_KCAL?: number; PROCNT?: number; FAT?: number; CHOCDF?: number; FIBTG?: number };
};

async function edamamBarcode(code: string): Promise<Product | null> {
  const id = process.env.EDAMAM_APP_ID;
  const key = process.env.EDAMAM_APP_KEY;
  if (!id || !key) return null;
  const params = new URLSearchParams({ app_id: id, app_key: key, upc: code });
  const data = await getJson<{ hints?: { food: EdamamFood }[] }>(
    `https://api.edamam.com/api/food-database/v2/parser?${params}`,
  );
  const f = data?.hints?.[0]?.food;
  if (!f?.nutrients?.ENERC_KCAL) return null;
  return {
    barcode: code,
    name: f.label,
    brand: f.brand ?? null,
    kcal_100g: Math.round(f.nutrients.ENERC_KCAL),
    protein_100g: n(f.nutrients.PROCNT),
    carbs_100g: n(f.nutrients.CHOCDF),
    fat_100g: n(f.nutrients.FAT),
    fiber_100g: n(f.nutrients.FIBTG),
    image_url: f.image ?? null,
    source: "edamam",
  };
}

// ───────────────────────── UPCitemdb (sadece isim) ─────────────────────────

async function upcItemDbName(code: string): Promise<Product | null> {
  const data = await getJson<{ items?: { title?: string; brand?: string; images?: string[] }[] }>(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
  );
  const item = data?.items?.[0];
  if (!item?.title) return null;
  return {
    barcode: code,
    name: item.title,
    brand: item.brand || null,
    kcal_100g: null,
    image_url: item.images?.[0] ?? null,
    source: "upcitemdb",
  };
}

// ───────────────────────── Public API ─────────────────────────

/**
 * Looks a barcode up in every external source, in order. Returns the first
 * result with calories; if none has calories, returns the best partial hit
 * (name only) so the form can be pre-filled.
 */
export async function lookupBarcodeExternal(code: string): Promise<Product | null> {
  let partial: Product | null = null;
  for (const source of [offBarcode, usdaBarcode, edamamBarcode, upcItemDbName]) {
    const p = await source(code);
    if (!p) continue;
    if (p.kcal_100g != null) return partial ? { ...p, image_url: p.image_url ?? partial.image_url } : p;
    partial ??= p;
  }
  return partial;
}

export async function searchExternal(q: string): Promise<Product[]> {
  const [off, usda] = await Promise.all([offSearch(q), usdaSearch(q)]);
  return [...off, ...usda];
}

export function isValidBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code);
}
