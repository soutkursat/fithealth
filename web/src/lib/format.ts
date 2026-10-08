const nf0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export const kcal = (n: number | null | undefined) => (n == null ? "—" : nf0.format(Math.round(n)));
export const num1 = (n: number | null | undefined) => (n == null ? "—" : nf1.format(n));
export const grams = (n: number | null | undefined) => (n == null ? "—" : `${nf0.format(Math.round(n))} g`);

/** Scale per-100g nutrition to a portion. */
export function scale(per100: number | null | undefined, g: number): number | null {
  if (per100 == null || Number.isNaN(per100)) return null;
  return Math.round(((per100 * g) / 100) * 10) / 10;
}

/** 1 kg body fat ≈ 7700 kcal. */
export const KCAL_PER_KG = 7700;
