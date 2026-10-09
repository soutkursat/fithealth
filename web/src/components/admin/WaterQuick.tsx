"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "./context";

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

/** Tek dokunuşla su ekleme + günün protein durumu. */
export function WaterQuick() {
  const { supabase, date, toast, version, bump } = useAdmin();
  const [logs, setLogs] = useState<{ id: number; ml: number }[]>([]);
  const [protein, setProtein] = useState(0);
  const [goals, setGoals] = useState({ water: 2500, protein: 120 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from("water_logs").select("id, ml").eq("log_date", date).order("created_at"),
      supabase.from("food_logs").select("protein").eq("log_date", date),
      supabase.from("settings").select("water_goal_ml, protein_goal_g").eq("id", 1).maybeSingle(),
    ]).then(([w, f, s]) => {
      if (!alive) return;
      setLogs((w.data ?? []) as { id: number; ml: number }[]);
      setProtein((f.data ?? []).reduce((t, r) => t + Number(r.protein ?? 0), 0));
      if (s.data) setGoals({ water: Number(s.data.water_goal_ml ?? 2500), protein: Number(s.data.protein_goal_g ?? 120) });
    });
    return () => {
      alive = false;
    };
  }, [supabase, date, version]);

  const total = logs.reduce((t, l) => t + l.ml, 0);

  async function add(ml: number) {
    setBusy(true);
    const { data, error } = await supabase.from("water_logs").insert({ log_date: date, ml }).select("id, ml").single();
    setBusy(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    setLogs((l) => [...l, data as { id: number; ml: number }]);
    const next = total + ml;
    toast(next >= goals.water && total < goals.water ? "Su hedefi tamam! 💦" : `+${ml} ml su`);
    bump();
  }

  async function undo() {
    const last = logs.at(-1);
    if (!last) return;
    setBusy(true);
    const { error } = await supabase.from("water_logs").delete().eq("id", last.id);
    setBusy(false);
    if (error) return toast(error.message, "err");
    setLogs((l) => l.slice(0, -1));
    bump();
  }

  const bar = (pct: number, cls: string) => (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={`h-full rounded-full bg-gradient-to-r ${cls} transition-[width] duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold text-ink-2">💧 Su</div>
          <div className="text-lg font-bold">
            {fmt.format(total / 1000)} <span className="text-xs font-medium text-muted">/ {fmt.format(goals.water / 1000)} L</span>
          </div>
          {bar((total / goals.water) * 100, "from-[#0ea5e9] to-[#7dd3fc]")}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold text-ink-2">🥩 Protein</div>
          <div className="text-lg font-bold">
            {fmt.format(protein)} <span className="text-xs font-medium text-muted">/ {fmt.format(goals.protein)} g</span>
          </div>
          {bar((protein / goals.protein) * 100, "from-[#199e70] to-[#3ddc97]")}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <button type="button" disabled={busy} onClick={() => add(250)} className="rounded-xl bg-[#0ea5e9]/15 px-3 py-2.5 text-sm font-bold text-[#7dd3fc] ring-1 ring-[#0ea5e9]/40 active:scale-95 disabled:opacity-50">
          +1 bardak <span className="font-normal opacity-70">250 ml</span>
        </button>
        <button type="button" disabled={busy} onClick={() => add(500)} className="rounded-xl bg-[#0ea5e9]/15 px-3 py-2.5 text-sm font-bold text-[#7dd3fc] ring-1 ring-[#0ea5e9]/40 active:scale-95 disabled:opacity-50">
          +½ litre <span className="font-normal opacity-70">500 ml</span>
        </button>
        <button type="button" disabled={busy || logs.length === 0} onClick={undo} className="rounded-xl border border-line px-3 py-2.5 text-sm disabled:opacity-40" aria-label="Son su kaydını geri al">
          ↶
        </button>
      </div>
    </section>
  );
}
