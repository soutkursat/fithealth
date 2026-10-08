import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { StatTile } from "@/components/StatTile";
import { MacroBar } from "@/components/MacroBar";
import { MealList } from "@/components/MealList";
import { PageSkeleton, SetupNotice } from "@/components/Setup";
import { balance, getDay } from "@/lib/data";
import { isConfigured } from "@/lib/supabase";
import { addDays, formatDate, isValidIsoDate } from "@/lib/dates";
import { kcal, num1 } from "@/lib/format";

export default function DayPage({ params }: PageProps<"/gun/[date]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-8">
        {isConfigured ? (
          <Suspense fallback={<PageSkeleton />}>
            {params.then(({ date }) => (
              <Day date={date} />
            ))}
          </Suspense>
        ) : (
          <SetupNotice />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function Day({ date }: { date: string }) {
  if (!isValidIsoDate(date)) notFound();
  const { settings, logs, summary } = await getDay(date);
  const b = balance(summary);
  const nav = "rounded-full border border-line bg-white/[0.03] px-3.5 py-1.5 text-sm font-medium transition hover:bg-white/[0.07] hover:text-ink";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="reveal text-2xl font-extrabold tracking-tight sm:text-3xl">{formatDate(date, { day: "numeric", month: "long", year: "numeric", weekday: "long" })}</h1>
        <div className="flex gap-2">
          <Link className={nav} href={`/gun/${addDays(date, -1)}`}>← Önceki</Link>
          <Link className={nav} href={`/gun/${addDays(date, 1)}`}>Sonraki →</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Alınan" swatch="in" value={kcal(summary.kcal_in)} unit="kcal" hint={`Hedef ${kcal(settings.daily_kcal_goal)} kcal`} />
        <StatTile
          label="Harcanan"
          swatch="out"
          value={summary.total_kcal != null && summary.total_estimated ? `~${kcal(summary.total_kcal)}` : kcal(summary.total_kcal)}
          unit="kcal"
          hint={summary.total_estimated ? "Tahmini (dinlenme) değeri" : summary.active_kcal != null ? `Aktif ${kcal(summary.active_kcal)} kcal` : undefined}
        />
        <StatTile
          label="Denge"
          value={b == null ? "—" : `${b > 0 ? "+" : b < 0 ? "−" : ""}${kcal(Math.abs(b))}`}
          unit="kcal"
          tone={b == null ? undefined : b <= 0 ? "good" : "bad"}
        />
        <StatTile label="Kilo" value={summary.kg != null ? num1(summary.kg) : "—"} unit={summary.kg != null ? "kg" : undefined} hint={summary.steps != null ? `${kcal(summary.steps)} adım` : undefined} />
      </div>
      {summary.kcal_in > 0 && (
        <div className="glass reveal p-4 sm:p-5">
          <MacroBar protein={summary.protein} carbs={summary.carbs} fat={summary.fat} />
        </div>
      )}
      <MealList logs={logs} emptyText="Bu gün için yemek kaydı yok." />
    </div>
  );
}
