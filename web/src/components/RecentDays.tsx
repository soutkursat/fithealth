"use client";

import { useState } from "react";
import Link from "next/link";
import { MEALS, type Meal } from "@/lib/types";

export type RecentDay = {
  date: string;
  label: string;
  in: number | null;
  out: number | null;
  bal: number | null;
  estimated: boolean;
  steps: number | null;
  kg: number | null;
  /** Hareketle yakılan, alev günüyse (1000+). */
  fire: number | null;
  protein: number;
  carbs: number;
  fat: number;
  foods: { name: string; kcal: number; meal: Meal }[];
};

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export function RecentDays({ days }: { days: RecentDay[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const max = Math.max(1, ...days.flatMap((d) => [d.in ?? 0, d.out ?? 0]));

  if (days.length === 0) return <p className="glass p-8 text-center text-sm text-muted">Henüz kayıt yok.</p>;

  return (
    <ul className="flex flex-col gap-2.5">
      {days.map((d, i) => {
        const isOpen = open === d.date;
        const verdict =
          d.bal == null
            ? { text: "Hesap yok", cls: "bg-white/5 text-muted" }
            : d.bal <= 0
              ? { text: `−${fmt.format(Math.abs(d.bal))} açık`, cls: "bg-good/15 text-good ring-1 ring-good/30" }
              : { text: `+${fmt.format(d.bal)} fazla`, cls: "bg-bad/15 text-bad ring-1 ring-bad/30" };
        return (
          <li
            key={d.date}
            className={`glass glass-hover reveal overflow-hidden ${d.fire != null ? "border-[#ff8a3c]/40 shadow-[0_0_28px_-10px_rgba(255,90,30,0.8)]" : ""}`}
            style={{ ["--d" as string]: `${i * 50}ms` }}
          >
            <button
              type="button"
              className="flex w-full flex-col gap-3 p-4 text-left sm:p-5"
              onClick={() => setOpen(isOpen ? null : d.date)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-bold">
                  {d.label}
                  {d.fire != null && (
                    <span className="rounded-full bg-[#ff4d2e]/15 px-2 py-0.5 text-[11px] font-bold text-[#ff9a5c] ring-1 ring-[#ff4d2e]/40" title={`Hareketle ${fmt.format(d.fire)} kcal`}>
                      <span className="flame-icon" aria-hidden>🔥</span> Alev günü
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${verdict.cls}`}>{verdict.text}</span>
                  <span aria-hidden className={`text-muted transition ${isOpen ? "rotate-90" : ""}`}>›</span>
                </span>
              </div>
              <div className="grid gap-1.5">
                <Bar label="Yenilen" value={d.in} max={max} cls="bg-in" />
                <Bar label="Yakılan" value={d.out} max={max} cls="bg-out" note={d.estimated ? "tahmini" : undefined} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {d.steps != null && <span>👣 {fmt.format(d.steps)} adım</span>}
                {d.kg != null && <span>⚖️ {fmt1.format(d.kg)} kg</span>}
                {d.foods.length > 0 && <span>🍽️ {d.foods.length} kalem</span>}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-line bg-white/[0.015] px-4 py-4 sm:px-5">
                {d.foods.length === 0 ? (
                  <p className="text-sm text-muted">Bu gün sofraya bir şey kaydedilmemiş.</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-ink-2">
                      Protein <b className="text-ink">{fmt.format(d.protein)} g</b> · Karbonhidrat <b className="text-ink">{fmt.format(d.carbs)} g</b> · Yağ{" "}
                      <b className="text-ink">{fmt.format(d.fat)} g</b>
                    </p>
                    <ul className="grid gap-1 text-sm sm:grid-cols-2 sm:gap-x-6">
                      {d.foods.map((f, j) => (
                        <li key={j} className="flex justify-between gap-3 border-b border-line/60 py-1">
                          <span className="truncate text-ink-2">
                            <span aria-hidden className="mr-1">{MEALS.find((m) => m.key === f.meal)?.emoji}</span>
                            {f.name}
                          </span>
                          <span className="shrink-0 font-semibold tabular">{fmt.format(f.kcal)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Link href={`/gun/${d.date}`} className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
                  Günün tam dökümü →
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bar({ label, value, max, cls, note }: { label: string; value: number | null; max: number; cls: string; note?: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
      <span className="text-ink-2">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
        {value != null && <div className={`bar-grow h-full rounded-full ${cls}`} style={{ width: `${(value / max) * 100}%` }} />}
      </div>
      <span className="min-w-20 text-right font-semibold tabular">
        {value == null ? "—" : `${fmt.format(value)} kcal`}
        {note && <span className="ml-1 font-normal text-muted">({note})</span>}
      </span>
    </div>
  );
}
