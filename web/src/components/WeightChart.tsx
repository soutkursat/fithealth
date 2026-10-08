"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type WeightPoint = { date: string; label: string; kg: number };

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function TipContent({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as WeightPoint;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg">
      <div className="text-ink-2">{p.label}</div>
      <div className="font-semibold">{fmt.format(p.kg)} kg</div>
    </div>
  );
}

export function WeightChart({ data, target }: { data: WeightPoint[]; target: number | null }) {
  if (data.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Grafik için en az iki kilo kaydı gerekiyor.</p>;
  }
  const values = data.map((d) => d.kg).concat(target != null ? [target] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="kg-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5aa9ff" stopOpacity={0.35} />
              <stop offset="1" stopColor="#5aa9ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fill: "var(--muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis domain={[min, max]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v: number) => fmt.format(v)} width={48} allowDecimals={false} />
          <Tooltip content={(p) => <TipContent active={p.active} payload={p.payload} />} cursor={{ stroke: "var(--axis)" }} />
          {target != null && (
            <ReferenceLine y={target} stroke="var(--good-mark)" strokeDasharray="4 4" label={{ value: `Hedef ${fmt.format(target)} kg`, position: "insideBottomRight", fill: "var(--ink-2)", fontSize: 11 }} />
          )}
          <Area
            type="monotone"
            dataKey="kg"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#kg-fill)"
            style={{ filter: "drop-shadow(0 0 6px rgba(90,169,255,0.6))" }}
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--accent)", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
