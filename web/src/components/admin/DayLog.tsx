"use client";

import { useEffect, useState } from "react";
import { MEALS, type FoodLog } from "@/lib/types";
import { kcal, num1 } from "@/lib/format";
import { burn } from "@/lib/calc";
import { BurnSection } from "./BurnSection";
import { WaterQuick } from "./WaterQuick";
import { useAdmin } from "./context";

export function DayLog() {
  const { supabase, date, toast, version, bump } = useAdmin();
  const [logs, setLogs] = useState<FoodLog[] | null>(null);
  const [burned, setBurned] = useState<{ kcal: number | null; estimated: boolean } | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from("food_logs").select("*").eq("log_date", date).order("eaten_at"),
      supabase.from("daily_summary").select("total_kcal, total_estimated, manual_total_kcal, extra_kcal, steps").eq("log_date", date).maybeSingle(),
      supabase.from("settings").select("daily_kcal_goal").eq("id", 1).maybeSingle(),
    ]).then(([l, a, s]) => {
      if (!alive) return;
      setLogs((l.data ?? []).map((r) => ({ ...r, kcal: Number(r.kcal) })) as FoodLog[]);
      const r = a.data;
      setBurned(
        r
          ? burn({
              total_kcal: r.total_kcal == null ? null : Number(r.total_kcal),
              total_estimated: r.total_estimated === true,
              manual_total_kcal: r.manual_total_kcal == null ? null : Number(r.manual_total_kcal),
              extra_kcal: r.extra_kcal == null ? null : Number(r.extra_kcal),
            })
          : null,
      );
      setSteps(r?.steps ?? null);
      setGoal(s.data?.daily_kcal_goal ?? null);
    });
    return () => {
      alive = false;
    };
  }, [supabase, date, version]);

  async function remove(l: FoodLog) {
    if (!confirm(`“${l.name}” silinsin mi?`)) return;
    const { error } = await supabase.from("food_logs").delete().eq("id", l.id);
    if (error) return toast(`Silinemedi: ${error.message}`, "err");
    toast("Silindi");
    bump();
  }

  if (!logs) return <p className="py-10 text-center text-sm text-muted">Yükleniyor…</p>;
  const total = logs.reduce((s, l) => s + l.kcal, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Tile label="Yenilen" value={kcal(total)} />
        <Tile label="Yakılan" value={burned?.kcal == null ? "—" : `${burned.estimated ? "~" : ""}${kcal(burned.kcal)}`} />
        <Tile label="Kalan erzak" value={goal != null ? kcal(goal - total) : "—"} />
      </div>
      {steps != null && <p className="text-center text-xs text-muted">👣 {kcal(steps)} adım</p>}
      <WaterQuick />
      {logs.length === 0 && <p className="card p-6 text-center text-sm text-muted">Bu gün sofraya bir şey kaydedilmemiş.</p>}
      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m.key);
        if (!items.length) return null;
        return (
          <section key={m.key} className="card overflow-hidden">
            <header className="flex justify-between border-b border-line px-4 py-2.5 text-sm font-semibold">
              <span>{m.emoji} {m.label}</span>
              <span>{kcal(items.reduce((s, l) => s + l.kcal, 0))} kcal</span>
            </header>
            <ul className="divide-y divide-[var(--border)]">
              {items.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted">{[l.brand, l.grams != null ? `${num1(Number(l.grams))} g` : null].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="text-sm font-semibold">{kcal(l.kcal)}</span>
                  <button type="button" onClick={() => remove(l)} className="rounded-lg px-2 py-1 text-bad hover:bg-surface-2" aria-label={`${l.name} sil`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <BurnSection />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
