import "server-only";
import { connection } from "next/server";
import { getPublicClient } from "./supabase";
import { addDays, isoDate } from "./dates";
import type { DailySummary, FoodLog, Settings, Weight } from "./types";

const DEFAULT_SETTINGS: Settings = {
  display_name: "Kurt",
  daily_kcal_goal: 2000,
  start_weight: null,
  target_weight: null,
  start_date: null,
};

const toNum = (v: unknown) => (v == null ? null : Number(v));

function normSummary(r: Record<string, unknown>): DailySummary {
  return {
    log_date: r.log_date as string,
    kcal_in: Number(r.kcal_in ?? 0),
    protein: Number(r.protein ?? 0),
    carbs: Number(r.carbs ?? 0),
    fat: Number(r.fat ?? 0),
    items: Number(r.items ?? 0),
    active_kcal: toNum(r.active_kcal),
    total_kcal: toNum(r.total_kcal),
    steps: toNum(r.steps),
    kg: toNum(r.kg),
    total_estimated: r.total_estimated === true,
  };
}

function normLog(r: Record<string, unknown>): FoodLog {
  return {
    ...(r as unknown as FoodLog),
    grams: toNum(r.grams),
    kcal: Number(r.kcal),
    protein: toNum(r.protein),
    carbs: toNum(r.carbs),
    fat: toNum(r.fat),
  };
}

async function getSettings(): Promise<Settings> {
  const { data } = await getPublicClient().from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    display_name: data.display_name ?? DEFAULT_SETTINGS.display_name,
    daily_kcal_goal: Number(data.daily_kcal_goal ?? DEFAULT_SETTINGS.daily_kcal_goal),
    start_weight: toNum(data.start_weight),
    target_weight: toNum(data.target_weight),
    start_date: data.start_date ?? null,
  };
}

async function getLogs(date: string): Promise<FoodLog[]> {
  const { data } = await getPublicClient()
    .from("food_logs")
    .select("*")
    .eq("log_date", date)
    .order("eaten_at", { ascending: true });
  return (data ?? []).map(normLog);
}

async function getSummaries(from: string, to: string): Promise<DailySummary[]> {
  const { data } = await getPublicClient()
    .from("daily_summary")
    .select("*")
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date", { ascending: true });
  return (data ?? []).map(normSummary);
}

async function getWeights(): Promise<Weight[]> {
  const { data } = await getPublicClient()
    .from("weights")
    .select("log_date, kg")
    .order("log_date", { ascending: true })
    .limit(1000);
  return (data ?? []).map((w) => ({ log_date: w.log_date, kg: Number(w.kg) }));
}

async function getLastSync(): Promise<string | null> {
  const { data } = await getPublicClient()
    .from("daily_activity")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.synced_at ?? null;
}

/** Fill gaps so charts show every day in the range. */
export function fillDays(rows: DailySummary[], from: string, to: string): DailySummary[] {
  const map = new Map(rows.map((r) => [r.log_date, r]));
  const out: DailySummary[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push(
      map.get(d) ?? {
        log_date: d,
        kcal_in: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        items: 0,
        active_kcal: null,
        total_kcal: null,
        steps: null,
        kg: null,
        total_estimated: false,
      },
    );
  }
  return out;
}

export async function getDashboard() {
  await connection();
  const today = isoDate();
  const from = addDays(today, -29);
  const [settings, logs, summaries, weights, lastSync] = await Promise.all([
    getSettings(),
    getLogs(today),
    getSummaries(from, today),
    getWeights(),
    getLastSync(),
  ]);
  return { today, settings, logs, summaries: fillDays(summaries, from, today), weights, lastSync };
}

export async function getDay(date: string) {
  await connection();
  const [settings, logs, summaries] = await Promise.all([getSettings(), getLogs(date), getSummaries(date, date)]);
  return { settings, logs, summary: fillDays(summaries, date, date)[0] };
}

export async function getHistory() {
  await connection();
  const today = isoDate();
  const [settings, summaries] = await Promise.all([getSettings(), getSummaries("2000-01-01", today)]);
  return { today, settings, summaries: summaries.reverse() };
}

/**
 * Energy balance for a day: intake minus total burn. Negative = deficit.
 * Only meaningful when both sides were recorded and the burn is real data
 * (not Health Connect's basal estimate).
 */
export function balance(
  s: Pick<DailySummary, "kcal_in" | "total_kcal" | "items" | "total_estimated">,
): number | null {
  if (s.total_kcal == null || s.total_estimated || s.items === 0) return null;
  return Math.round(s.kcal_in - s.total_kcal);
}
