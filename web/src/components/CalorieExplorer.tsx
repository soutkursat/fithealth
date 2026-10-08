"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ExplorerDay = {
  date: string;
  /** "8 Ekim" */
  label: string;
  /** "8 Ekim Salı" / "Bugün" */
  longLabel: string;
  in: number | null;
  out: number | null;
  bal: number | null;
  estimated: boolean;
};

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt.format(Math.abs(n))}`;
const GOOD = "#3ddc97";
const BAD = "#ff7a7a";

type Mode = "hesap" | "karsilastir";

export function CalorieExplorer({ days, goal }: { days: ExplorerDay[]; goal: number }) {
  const [mode, setMode] = useState<Mode>("hesap");
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [selected, setSelected] = useState<string | null>(null);

  const data = useMemo(() => days.slice(-range), [days, range]);
  const withBal = data.filter((d) => d.bal != null);
  const avg = withBal.length ? withBal.reduce((s, d) => s + (d.bal ?? 0), 0) / withBal.length : null;
  const deficitDays = withBal.filter((d) => (d.bal ?? 0) < 0).length;
  const sel = data.find((d) => d.date === selected) ?? [...data].reverse().find((d) => d.bal != null) ?? data.at(-1);

  const pick = (payload: unknown) => {
    const d = (payload as { payload?: ExplorerDay })?.payload;
    if (d?.date) setSelected(d.date);
  };

  const tab = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${active ? "bg-white/10 text-ink ring-1 ring-white/15" : "text-ink-2 hover:text-ink"}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Kontroller */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-line bg-white/[0.02] p-1" role="tablist" aria-label="Grafik türü">
          <button type="button" role="tab" aria-selected={mode === "hesap"} className={tab(mode === "hesap")} onClick={() => setMode("hesap")}>
            Günün hesabı
          </button>
          <button type="button" role="tab" aria-selected={mode === "karsilastir"} className={tab(mode === "karsilastir")} onClick={() => setMode("karsilastir")}>
            Yenilen vs yakılan
          </button>
        </div>
        <div className="flex rounded-full border border-line bg-white/[0.02] p-1" aria-label="Gün aralığı">
          {([7, 14, 30] as const).map((r) => (
            <button key={r} type="button" className={tab(range === r)} onClick={() => setRange(r)} aria-pressed={range === r}>
              {r} gün
            </button>
          ))}
        </div>
      </div>

      {/* Özet cümle */}
      {avg != null ? (
        <p className="text-sm text-ink-2">
          Son {range} günde ortalama günlük hesap{" "}
          <b className={avg <= 0 ? "text-good" : "text-bad"}>{signed(Math.round(avg))} kcal</b>
          {" · "}
          <b className="text-ink">{deficitDays}</b>/{withBal.length} gün açık verildi
        </p>
      ) : (
        <p className="text-sm text-muted">Hesap için hem yenilen hem yakılan kalori gerekiyor; veriler geldikçe dolacak.</p>
      )}

      {/* Lejant */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {mode === "hesap" ? (
          <>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm" style={{ background: GOOD }} />Açık (eksi): yağ eriyor</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm" style={{ background: BAD }} />Fazla (artı): depoya gitti</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-in" />Yenilen</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-out" />Yakılan</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-muted" />Günlük sınır ({fmt.format(goal)})</span>
          </>
        )}
      </div>

      {/* Grafik */}
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "hesap" ? (
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -6 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v: number) => signed(v)} width={52} />
              <ReferenceLine y={0} stroke="var(--axis)" strokeWidth={1.5} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={(p) => <BalanceTip active={p.active} payload={p.payload} />} />
              <Bar dataKey="bal" radius={[4, 4, 4, 4]} maxBarSize={26} onClick={pick} className="cursor-pointer">
                {data.map((d) => (
                  <Cell
                    key={d.date}
                    fill={(d.bal ?? 0) <= 0 ? GOOD : BAD}
                    fillOpacity={sel?.date === d.date ? 1 : 0.55}
                    style={sel?.date === d.date ? { filter: `drop-shadow(0 0 6px ${(d.bal ?? 0) <= 0 ? GOOD : BAD})` } : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fill: "var(--muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v: number) => fmt.format(v)} width={52} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={(p) => <BalanceTip active={p.active} payload={p.payload} />} />
              <ReferenceLine y={goal} stroke="var(--muted)" strokeDasharray="4 4" />
              <Bar dataKey="in" fill="var(--series-in)" radius={[4, 4, 0, 0]} maxBarSize={16} onClick={pick} className="cursor-pointer" />
              <Bar dataKey="out" fill="var(--series-out)" radius={[4, 4, 0, 0]} maxBarSize={16} onClick={pick} className="cursor-pointer" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Seçili gün */}
      {sel && <DayVerdict d={sel} />}

      <details className="group rounded-xl border border-line bg-white/[0.02] px-4 py-3 text-sm">
        <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
          <span className="mr-1 inline-block transition group-open:rotate-90">›</span> &quot;Günün hesabı&quot; ne demek?
        </summary>
        <div className="mt-2 space-y-1.5 text-ink-2">
          <p><b className="text-ink">Günün hesabı = yenilen − yakılan.</b></p>
          <p>
            <b className="text-good">Eksi çıkarsa</b> Kurt o gün yaktığından az yemiş demektir; vücut eksiği yağ deposundan
            karşılar. <b className="text-bad">Artı çıkarsa</b> fazlası depoya gider.
          </p>
          <p>Kabaca <b className="text-ink">7.700 kcal açık ≈ 1 kg yağ</b>. Yani her gün 500 kcal açık, haftada yarım kilo eder.</p>
        </div>
      </details>
    </div>
  );
}

function DayVerdict({ d }: { d: ExplorerDay }) {
  const grams = d.bal != null ? Math.round((Math.abs(d.bal) / 7700) * 1000) : null;
  return (
    <div className="grid gap-3 rounded-xl border border-line bg-white/[0.025] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{d.longLabel}</div>
        <p className="mt-1 text-sm text-ink-2">
          {d.bal == null ? (
            d.estimated ? "Telefondan gerçek yakım verisi gelmemiş; bu günün hesabı yapılamadı." : "Bu gün için yenilen ya da yakılan eksik; hesap yapılamadı."
          ) : d.bal <= 0 ? (
            <>Kurt bu gün yaktığından <b className="text-good">{fmt.format(Math.abs(d.bal))} kcal az</b> yedi. Yaklaşık <b className="text-ink">{grams} g yağ</b> eridi. 🔥</>
          ) : (
            <>Kurt bu gün yaktığından <b className="text-bad">{fmt.format(d.bal)} kcal fazla</b> yedi. Yaklaşık <b className="text-ink">{grams} g</b> depoya gitti. 🍰</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Num label="Yenilen" value={d.in} cls="text-in" />
        <Num label="Yakılan" value={d.out} cls="text-out" />
        <Link href={`/gun/${d.date}`} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-accent hover:bg-white/5">
          Detay →
        </Link>
      </div>
    </div>
  );
}

function Num({ label, value, cls }: { label: string; value: number | null; cls: string }) {
  return (
    <div>
      <div className={`text-[11px] font-semibold ${cls}`}>{label}</div>
      <div className="font-bold">{value == null ? "—" : fmt.format(value)}</div>
    </div>
  );
}

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function BalanceTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ExplorerDay;
  return (
    <div className="rounded-xl border border-line-strong bg-[#0f131b]/95 px-3 py-2 text-sm shadow-xl backdrop-blur">
      <div className="mb-1 font-semibold">{d.longLabel}</div>
      <div className="flex justify-between gap-6 text-ink-2"><span>Yenilen</span><b className="text-ink tabular">{d.in == null ? "—" : `${fmt.format(d.in)} kcal`}</b></div>
      <div className="flex justify-between gap-6 text-ink-2"><span>Yakılan</span><b className="text-ink tabular">{d.out == null ? "—" : `${fmt.format(d.out)} kcal`}</b></div>
      <div className={`mt-1 border-t border-line pt-1 font-semibold ${d.bal == null ? "text-muted" : d.bal <= 0 ? "text-good" : "text-bad"}`}>
        {d.bal == null ? "Hesap yok" : `${d.bal <= 0 ? "Açık" : "Fazla"} ${fmt.format(Math.abs(d.bal))} kcal`}
      </div>
    </div>
  );
}
