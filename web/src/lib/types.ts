export type Meal = "kahvalti" | "ogle" | "aksam" | "ara";

export const MEALS: { key: Meal; label: string; emoji: string }[] = [
  { key: "kahvalti", label: "Kahvaltı", emoji: "🍳" },
  { key: "ogle", label: "Öğle", emoji: "🥗" },
  { key: "aksam", label: "Akşam", emoji: "🍲" },
  { key: "ara", label: "Ara öğün", emoji: "🍎" },
];

export type Settings = {
  display_name: string;
  daily_kcal_goal: number;
  start_weight: number | null;
  target_weight: number | null;
  start_date: string | null;
  status_message: string | null;
  show_notes: boolean;
};

export type FoodLog = {
  id: number;
  log_date: string;
  meal: Meal;
  eaten_at: string;
  product_id: number | null;
  name: string;
  brand: string | null;
  grams: number | null;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  image_url: string | null;
  note: string | null;
};

export type DailySummary = {
  log_date: string;
  kcal_in: number;
  protein: number;
  carbs: number;
  fat: number;
  items: number;
  active_kcal: number | null;
  total_kcal: number | null;
  steps: number | null;
  kg: number | null;
  /** total_kcal is only Health Connect's basal estimate, not real data. */
  total_estimated: boolean;
  /** Admin-entered day total, used only when the phone sent no real total. */
  manual_total_kcal: number | null;
  /** Admin-entered extra activity, added on top of the day's burn. */
  extra_kcal: number | null;
};

export type Note = { id: number; name: string; message: string; created_at: string };

export type MotivationCounts = { today: number; total: number };

export type Weight = { log_date: string; kg: number };

/** Besin değerleri 100 g başınadır. */
export type Product = {
  id?: number;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  kcal_100g: number | null;
  protein_100g?: number | null;
  carbs_100g?: number | null;
  fat_100g?: number | null;
  sugar_100g?: number | null;
  fiber_100g?: number | null;
  salt_100g?: number | null;
  serving_g?: number | null;
  image_url?: string | null;
  source: string;
};

export const SOURCE_LABELS: Record<string, string> = {
  local: "Kayıtlı",
  manual: "Benim eklediğim",
  "tr-temel": "Temel besin",
  openfoodfacts: "Open Food Facts",
  usda: "USDA",
  edamam: "Edamam",
  upcitemdb: "UPCitemdb",
};
