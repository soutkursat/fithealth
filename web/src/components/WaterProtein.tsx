const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const GLASS_ML = 250;

/** Günlük su ve protein hedefi kartları. */
export function WaterProtein({
  waterMl,
  waterGoal,
  protein,
  proteinGoal,
}: {
  waterMl: number;
  waterGoal: number;
  protein: number;
  proteinGoal: number;
}) {
  const glasses = Math.max(1, Math.round(waterGoal / GLASS_ML));
  const filled = Math.floor(waterMl / GLASS_ML);
  const waterPct = waterGoal > 0 ? (waterMl / waterGoal) * 100 : 0;
  const proteinPct = proteinGoal > 0 ? (protein / proteinGoal) * 100 : 0;
  const waterDone = waterMl >= waterGoal;
  const proteinDone = protein >= proteinGoal;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="glass reveal flex flex-col gap-2 p-4 sm:p-5" style={{ ["--d" as string]: "280ms" }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-ink-2">💧 Su</span>
          <span className="text-xs text-muted">{waterDone ? "Bozkurt suya kandı 💦" : `${fmt.format(Math.max(0, waterGoal - waterMl) / 1000)} L kaldı`}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {fmt.format(waterMl / 1000)}
          <span className="ml-1 text-sm font-medium text-ink-2">/ {fmt.format(waterGoal / 1000)} L</span>
        </div>
        <div className="flex flex-wrap gap-1" aria-label={`${filled} bardak içildi, hedef ${glasses} bardak`}>
          {Array.from({ length: Math.max(glasses, filled) }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-5 w-3.5 rounded-b-md rounded-t-sm border transition ${
                i < filled
                  ? "border-[#38bdf8]/70 bg-gradient-to-t from-[#0ea5e9] to-[#7dd3fc] shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  : "border-white/15 bg-white/[0.03]"
              }`}
            />
          ))}
        </div>
        <Bar pct={waterPct} cls="from-[#0ea5e9] to-[#7dd3fc]" />
      </div>

      <div className="glass reveal flex flex-col gap-2 p-4 sm:p-5" style={{ ["--d" as string]: "320ms" }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-ink-2">🥩 Protein</span>
          <span className="text-xs text-muted">{proteinDone ? "Kaslar selam söylüyor 💪" : `${fmt.format(Math.max(0, proteinGoal - protein))} g kaldı`}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {fmt.format(protein)}
          <span className="ml-1 text-sm font-medium text-ink-2">/ {fmt.format(proteinGoal)} g</span>
        </div>
        <p className="text-xs text-muted">Kilo verirken kas kaybetmemek için protein şart.</p>
        <Bar pct={proteinPct} cls="from-[#199e70] to-[#3ddc97]" />
      </div>
    </div>
  );
}

function Bar({ pct, cls }: { pct: number; cls: string }) {
  return (
    <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={`bar-grow h-full rounded-full bg-gradient-to-r ${cls}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
