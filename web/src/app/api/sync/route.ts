import { timingSafeEqual } from "node:crypto";
import { bearer, getAdminClient } from "@/lib/supabase-admin";
import { isValidIsoDate } from "@/lib/dates";

/**
 * Android köprü uygulaması (Health Connect) buraya veri gönderir.
 *
 * POST /api/sync
 * Authorization: Bearer <SYNC_TOKEN>
 * {
 *   "days":    [{ "date": "2026-10-08", "activeKcal": 512, "totalKcal": 2480, "steps": 9120, "distanceM": 6800 }],
 *   "weights": [{ "date": "2026-10-08", "kg": 92.4 }]
 * }
 */

type DayIn = { date: string; activeKcal?: number | null; totalKcal?: number | null; steps?: number | null; distanceM?: number | null };
type WeightIn = { date: string; kg: number };

function tokenOk(given: string | null): boolean {
  const expected = process.env.SYNC_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const num = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 10) / 10 : null;

export async function POST(req: Request) {
  if (!tokenOk(bearer(req))) {
    return Response.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let body: { days?: DayIn[]; weights?: WeightIn[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const days = (Array.isArray(body.days) ? body.days : [])
    .filter((d) => d && typeof d.date === "string" && isValidIsoDate(d.date))
    .slice(0, 62)
    .map((d) => ({
      log_date: d.date,
      active_kcal: num(d.activeKcal, 20000),
      total_kcal: num(d.totalKcal, 30000),
      steps: num(d.steps, 500000),
      distance_m: num(d.distanceM, 1000000),
      source: "health-connect",
      synced_at: now,
    }));

  const weightsIn = (Array.isArray(body.weights) ? body.weights : [])
    .filter((w) => w && typeof w.date === "string" && isValidIsoDate(w.date) && num(w.kg, 399) != null && w.kg > 20)
    .slice(0, 62);

  const supabase = getAdminClient();

  if (days.length) {
    const { error } = await supabase.from("daily_activity").upsert(days, { onConflict: "log_date" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  let weightsSaved = 0;
  if (weightsIn.length) {
    // Elle girilmiş kilo kayıtlarının üzerine yazma.
    const { data: manual } = await supabase
      .from("weights")
      .select("log_date")
      .eq("source", "manual")
      .in("log_date", weightsIn.map((w) => w.date));
    const manualDates = new Set((manual ?? []).map((m) => m.log_date as string));
    const rows = weightsIn
      .filter((w) => !manualDates.has(w.date))
      .map((w) => ({ log_date: w.date, kg: Math.round(w.kg * 100) / 100, source: "health-connect" }));
    if (rows.length) {
      const { error } = await supabase.from("weights").upsert(rows, { onConflict: "log_date" });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      weightsSaved = rows.length;
    }
  }

  return Response.json({ ok: true, days: days.length, weights: weightsSaved, at: now });
}

export async function GET() {
  return Response.json({ ok: true, service: "Kurt Giderek Azalıyor senkron" });
}
