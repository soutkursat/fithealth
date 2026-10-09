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

/** Hareketle yakılan kalori bu sınırı geçerse gün "alev alev" gösterilir. */
export const FIRE_KCAL = 1000;

/** Hareketle yakılan (telefonun aktif kalorisi + elle eklenen ek aktivite). */
export function activeBurn(s: Pick<DailySummary, "active_kcal" | "extra_kcal">): number | null {
  if (s.active_kcal == null && s.extra_kcal == null) return null;
  return (s.active_kcal ?? 0) + (s.extra_kcal ?? 0);
}

export function isFireDay(s: Pick<DailySummary, "active_kcal" | "extra_kcal">): boolean {
  return (activeBurn(s) ?? 0) >= FIRE_KCAL;
}

// ───────────────────────── Kızılelma tahmini ─────────────────────────

export type GoalProjection =
  | { status: "reached" }
  | { status: "noData"; reason: string }
  | { status: "noTarget" }
  /** Kilo düşüyor: tahmini varış tarihi. */
  | { status: "ok"; etaDate: string; days: number; weeklyKg: number; source: "tarti" | "kalori" }
  /** Düşüş var ama 3 yıldan uzun sürüyor. */
  | { status: "far"; weeklyKg: number; source: "tarti" | "kalori" }
  /** Kilo yerinde sayıyor ya da artıyor. */
  | { status: "flat" | "up"; weeklyKg: number; source: "tarti" | "kalori" };

const DAY_MS = 86_400_000;
const dayNum = (iso: string) => Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / DAY_MS);
const fromDayNum = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** Least-squares slope (kg/day) of weight over time. */
function slopePerDay(points: { log_date: string; kg: number }[]): number {
  const xs = points.map((p) => dayNum(p.log_date));
  const ys = points.map((p) => p.kg);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * "Bu hızla Kızılelma'ya ne zaman?" Son 6 haftanın tartılarındaki eğilimi
 * kullanır (en az 3 tartı, en az 7 gün aralık). Tartı yetmezse son 14 günün
 * ortalama kalori açığından (7700 kcal ≈ 1 kg) hesaplar.
 */
export function projectGoal(
  weights: { log_date: string; kg: number }[],
  target: number | null,
  today: string,
  recentBalances: number[],
): GoalProjection {
  if (target == null) return { status: "noTarget" };
  const current = weights.at(-1)?.kg;
  if (current == null) return { status: "noData", reason: "Tahmin için önce bir tartı lazım." };
  if (current <= target) return { status: "reached" };

  const from = dayNum(today) - 42;
  const recent = weights.filter((w) => dayNum(w.log_date) >= from);
  const span = recent.length ? dayNum(recent.at(-1)!.log_date) - dayNum(recent[0].log_date) : 0;

  let perDay: number;
  let source: "tarti" | "kalori";
  if (recent.length >= 3 && span >= 7) {
    perDay = slopePerDay(recent);
    source = "tarti";
  } else if (recentBalances.length >= 5) {
    perDay = recentBalances.reduce((s, b) => s + b, 0) / recentBalances.length / 7700;
    source = "kalori";
  } else {
    return { status: "noData", reason: "Tahmin için en az bir haftaya yayılmış 3 tartı ya da 5 günlük kalori hesabı lazım." };
  }

  const weeklyKg = Math.round(perDay * 7 * 100) / 100;
  if (perDay > 0.005) return { status: "up", weeklyKg, source };
  if (perDay > -0.005) return { status: "flat", weeklyKg, source };
  const days = Math.ceil((current - target) / -perDay);
  if (days > 3 * 365) return { status: "far", weeklyKg, source };
  return { status: "ok", etaDate: fromDayNum(dayNum(today) + days), days, weeklyKg, source };
}
