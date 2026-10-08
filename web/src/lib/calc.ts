import type { DailySummary } from "./types";

export type Burn = {
  /** Effective kcal burned (base + extra), or null when no usable base. */
  kcal: number | null;
  /** Base is only Health Connect's resting estimate. */
  estimated: boolean;
  /** Base came from a manual day total. */
  manual: boolean;
  extra: number;
};

type BurnInput = Pick<DailySummary, "total_kcal" | "total_estimated" | "manual_total_kcal" | "extra_kcal">;

/**
 * Burned calories for a day. Real phone data wins; a manual day total is
 * used only when the phone sent nothing real; the resting estimate is the
 * last resort. Manual extra activity is added on top.
 */
export function burn(s: BurnInput): Burn {
  const extra = s.extra_kcal ?? 0;
  let base: number | null = null;
  let estimated = false;
  let manual = false;
  if (s.total_kcal != null && !s.total_estimated) base = s.total_kcal;
  else if (s.manual_total_kcal != null) {
    base = s.manual_total_kcal;
    manual = true;
  } else if (s.total_kcal != null) {
    base = s.total_kcal;
    estimated = true;
  }
  return { kcal: base == null ? null : base + extra, estimated, manual, extra };
}

/**
 * Energy balance for a day: intake minus burn. Negative = deficit.
 * Only meaningful when food was logged and the burn isn't just an estimate.
 */
export function balance(s: BurnInput & Pick<DailySummary, "kcal_in" | "items">): number | null {
  const b = burn(s);
  if (b.kcal == null || b.estimated || s.items === 0) return null;
  return Math.round(s.kcal_in - b.kcal);
}
