"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CaloriePoint = { date: string; label: string; in: number | null; out: number | null };

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function TipContent({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as CaloriePoint;
  const diff = p.in != null && p.out != null ? p.in - p.out : null;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 font-medium">{p.label}</div>
      <Row swatch="bg-in" label="Alınan" value={p.in} />
      <Row swatch="bg-out" label="Harcanan" value={p.out} />
      {diff != null && (
        <div className={`mt-1 border-t border-line pt-1 ${diff <= 0 ? "text-good" : "text-bad"}`}>
          {diff <= 0 ? "Açık" : "Fazla"} {fmt.format(Math.abs(diff))} kcal
        </div>
      )}
    </div>
  );
}

function Row({ swatch, label, value }: { swatch: string; label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-2 text-ink-2">
      <span aria-hidden className={`inline-block size-2.5 rounded-sm ${swatch}`} />
      {label}
      <span className="ml-auto pl-3 font-medium text-ink tabular">{value == null ? "—" : `${fmt.format(value)} kcal`}</span>
    </div>
  );
}

export function CalorieChart({ data, goal }: { data: CaloriePoint[]; goal: number }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
        <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-sm bg-in" />Alınan</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-sm bg-out" />Harcanan</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-0 w-4 border-t-2 border-dashed border-muted" />Hedef ({fmt.format(goal)})</span>
      </div>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fill: "var(--muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v: number) => fmt.format(v)} width={48} />
            <Tooltip content={(p) => <TipContent active={p.active} payload={p.payload} />} cursor={{ fill: "var(--surface-2)" }} />
            <ReferenceLine y={goal} stroke="var(--muted)" strokeDasharray="4 4" />
            <Bar dataKey="in" name="Alınan" fill="var(--series-in)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="out" name="Harcanan" fill="var(--series-out)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
