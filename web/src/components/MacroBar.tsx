import { num1 } from "@/lib/format";

/** Protein / karbonhidrat / yağ dağılımı (kalori payına göre). */
export function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const parts = [
    { key: "Protein", g: protein, kcal: protein * 4, cls: "bg-m-protein" },
    { key: "Karbonhidrat", g: carbs, kcal: carbs * 4, cls: "bg-m-carbs" },
    { key: "Yağ", g: fat, kcal: fat * 9, cls: "bg-m-fat" },
  ];
  const total = parts.reduce((s, p) => s + p.kcal, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        {total > 0 &&
          parts.map((p) => (
            <div key={p.key} className={`${p.cls} bar-grow h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(p.kcal / total) * 100}%` }} />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block size-2.5 rounded-full ${p.cls}`} />
            {p.key} <span className="font-semibold text-ink">{num1(p.g)} g</span>
            {total > 0 && <span className="text-muted">%{Math.round((p.kcal / total) * 100)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
