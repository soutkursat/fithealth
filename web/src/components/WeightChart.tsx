"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type WeightPoint = { date: string; label: string; kg: number };
type ChartPoint = { date: string; label: string; t: number; kg: number | null; proj?: number };

const DAY = 86_400_000;
const toT = (iso: string) => Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / DAY);
const axisFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
const axisLabel = (t: number) => axisFmt.format(new Date(Math.round(t) * DAY));

const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function TipContent({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg">
      <div className="text-ink-2">{p.kg == null ? `${p.label} · tahmini varış` : p.label}</div>
      <div className="font-semibold">{fmt.format(p.kg ?? p.proj ?? 0)} kg</div>
    </div>
  );
}

export function WeightChart({
  data,
  target,
  eta,
}: {
  data: WeightPoint[];
  target: number | null;
  /** Tahmini varış: son tartıdan hedefe kesikli çizgi. */
  eta?: { date: string; label: string } | null;
}) {
  if (data.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Grafiğin çizilmesi için en az iki tartı lazım.</p>;
  }
  const values = data.map((d) => d.kg).concat(target != null ? [target] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  // Zaman ekseni gerçek gün sayısıyla: tahmin çizgisinin eğimi gerçek hızı gösterir.
  const points: ChartPoint[] = data.map((d, i) => ({
    ...d,
    t: toT(d.date),
    ...(i === data.length - 1 && eta && target != null ? { proj: d.kg } : {}),
  }));
  if (eta && target != null) points.push({ date: eta.date, label: eta.label, t: toT(eta.date), kg: null, proj: target });
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="kg-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5aa9ff" stopOpacity={0.35} />
              <stop offset="1" stopColor="#5aa9ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={axisLabel}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            minTickGap={40}
            allowDecimals={false}
          />
          <YAxis domain={[min, max]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v: number) => fmt.format(v)} width={48} allowDecimals={false} />
          <Tooltip content={(p) => <TipContent active={p.active} payload={p.payload} />} cursor={{ stroke: "var(--axis)" }} />
          {target != null && (
            <ReferenceLine y={target} stroke="var(--good-mark)" strokeDasharray="4 4" label={{ value: `Kızılelma ${fmt.format(target)} kg`, position: "insideBottomRight", fill: "var(--ink-2)", fontSize: 11 }} />
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
          {eta && target != null && (
            <Line
              type="linear"
              dataKey="proj"
              stroke="var(--accent)"
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeDasharray="6 6"
              connectNulls
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === points.length - 1 && props.cx != null && props.cy != null ? (
                  <text key="eta" x={props.cx} y={props.cy - 10} textAnchor="end" fontSize={16}>🍎</text>
                ) : (
                  <g key={props.index} />
                )
              }
              activeDot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
