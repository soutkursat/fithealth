import { MEALS, type FoodLog } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { kcal, num1 } from "@/lib/format";

export function MealList({ logs, emptyText = "Henüz bir şey girilmedi." }: { logs: FoodLog[]; emptyText?: string }) {
  if (logs.length === 0) {
    return <p className="glass p-8 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {MEALS.map((meal) => {
        const items = logs.filter((l) => l.meal === meal.key);
        if (items.length === 0) return null;
        const total = items.reduce((s, l) => s + l.kcal, 0);
        return (
          <section key={meal.key} className="glass glass-hover reveal overflow-hidden">
            <header className="flex items-center justify-between border-b border-line bg-white/[0.02] px-4 py-3">
              <h3 className="font-semibold">
                <span aria-hidden className="mr-1.5">{meal.emoji}</span>
                {meal.label}
              </h3>
              <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-sm font-semibold">{kcal(total)} kcal</span>
            </header>
            <ul className="divide-y divide-[var(--border)]">
              {items.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                  {l.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_url} alt="" className="size-10 shrink-0 rounded-xl bg-surface-2 object-cover ring-1 ring-white/5" loading="lazy" />
                  ) : (
                    <div aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-lg ring-1 ring-white/5">
                      {meal.emoji}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="truncate text-xs text-muted">
                      {[l.brand, l.grams != null ? `${num1(l.grams)} g` : null, formatTime(l.eaten_at)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{kcal(l.kcal)}</div>
                    <div className="text-[11px] text-muted">kcal</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
