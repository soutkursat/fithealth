import { Suspense } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { StatTile } from "@/components/StatTile";
import { MacroBar } from "@/components/MacroBar";
import { MealList } from "@/components/MealList";
import { CalorieChart } from "@/components/CalorieChart";
import { WeightChart } from "@/components/WeightChart";
import { PageSkeleton, SetupNotice } from "@/components/Setup";
import { DayTable } from "@/components/DayTable";
import { balance, getDashboard } from "@/lib/data";
import { isConfigured } from "@/lib/supabase";
import { formatDate, formatDateTime, shortDate } from "@/lib/dates";
import { KCAL_PER_KG, kcal, num1 } from "@/lib/format";

export default function Home() {
  return (
    <>
      <SiteHeader active="bugun" />
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-8">
        {isConfigured ? (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        ) : (
          <SetupNotice />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function Dashboard() {
  const { today, settings, logs, summaries, weights, lastSync } = await getDashboard();
  const todaySum = summaries[summaries.length - 1];
  const kcalIn = logs.reduce((s, l) => s + l.kcal, 0);
  const remaining = settings.daily_kcal_goal - kcalIn;
  const bal = balance({ ...todaySum, kcal_in: kcalIn, items: logs.length });

  // Kilo ilerlemesi
  const current = weights.at(-1)?.kg ?? null;
  const start = settings.start_weight ?? weights[0]?.kg ?? null;
  const target = settings.target_weight;
  const lost = start != null && current != null ? start - current : null;
  const progress =
    start != null && current != null && target != null && start !== target
      ? Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100))
      : null;

  // Son 30 gündeki tahmini kalori açığı (iki taraf da kayıtlı günler)
  const tracked = summaries.map(balance).filter((b): b is number => b != null);
  const deficit = -tracked.reduce((s, b) => s + b, 0);

  const last14 = summaries.slice(-14).map((s) => ({
    date: s.log_date,
    label: shortDate(s.log_date),
    in: s.items > 0 ? Math.round(s.kcal_in) : null,
    out: s.total_kcal != null && !s.total_estimated ? Math.round(s.total_kcal) : null,
  }));
  const weightPoints = weights.map((w) => ({ date: w.log_date, label: shortDate(w.log_date), kg: w.kg }));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Kahraman: kilo */}
      <section className="card grid gap-5 p-5 sm:grid-cols-[1.2fr_1fr] sm:p-7">
        <div>
          <p className="text-sm text-ink-2">{settings.display_name} şu ana kadar</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">
            {lost != null ? `${lost > 0 ? "−" : lost < 0 ? "+" : ""}${num1(Math.abs(lost))}` : "—"}
            <span className="ml-2 text-xl font-normal text-ink-2">kg</span>
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {current != null ? <>Şu an <b className="text-ink">{num1(current)} kg</b></> : "Henüz kilo kaydı yok"}
            {target != null && <> · Hedef <b className="text-ink">{num1(target)} kg</b></>}
            {current != null && target != null && current > target && <> · Kalan {num1(current - target)} kg</>}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2">
          {progress != null && (
            <>
              <div className="flex justify-between text-sm text-ink-2">
                <span>{num1(start)} kg</span>
                <span className="font-medium text-ink">%{Math.round(progress)}</span>
                <span>{num1(target)} kg</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Hedefe ilerleme">
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
          {tracked.length > 0 && (
            <p className="text-sm text-ink-2">
              Son 30 günde {deficit >= 0 ? "toplam açık" : "toplam fazla"}{" "}
              <b className="text-ink">{kcal(Math.abs(deficit))} kcal</b> ≈{" "}
              <b className={deficit >= 0 ? "text-good" : "text-bad"}>{num1(Math.abs(deficit) / KCAL_PER_KG)} kg yağ</b>
            </p>
          )}
        </div>
      </section>

      {/* Bugün */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Bugün <span className="text-base font-normal text-ink-2">· {formatDate(today)}</span></h2>
          {lastSync && <span className="text-xs text-muted">Telefon senkronu: {formatDateTime(lastSync)}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Alınan" swatch="in" value={kcal(kcalIn)} unit="kcal" hint={`Hedef ${kcal(settings.daily_kcal_goal)} kcal`} />
          <StatTile
            label="Harcanan"
            swatch="out"
            value={todaySum.total_kcal != null && todaySum.total_estimated ? `~${kcal(todaySum.total_kcal)}` : kcal(todaySum.total_kcal)}
            unit="kcal"
            hint={
              todaySum.total_estimated
                ? "Tahmini (dinlenme) değeri"
                : todaySum.active_kcal != null
                  ? `Aktif ${kcal(todaySum.active_kcal)} kcal`
                  : "Telefondan gelecek"
            }
          />
          <StatTile
            label="Denge"
            value={bal == null ? "—" : `${bal > 0 ? "+" : bal < 0 ? "−" : ""}${kcal(Math.abs(bal))}`}
            unit="kcal"
            tone={bal == null ? undefined : bal <= 0 ? "good" : "bad"}
            hint={bal == null ? "Alınan − harcanan" : bal <= 0 ? "Kalori açığında 👍" : "Kalori fazlasında"}
          />
          <StatTile
            label={remaining >= 0 ? "Kalan hak" : "Hedef aşıldı"}
            value={kcal(Math.abs(remaining))}
            unit="kcal"
            tone={remaining >= 0 ? undefined : "bad"}
            hint={todaySum.steps != null ? `${kcal(todaySum.steps)} adım` : undefined}
          />
        </div>
        {kcalIn > 0 && (
          <div className="card p-4">
            <MacroBar
              protein={logs.reduce((s, l) => s + (l.protein ?? 0), 0)}
              carbs={logs.reduce((s, l) => s + (l.carbs ?? 0), 0)}
              fat={logs.reduce((s, l) => s + (l.fat ?? 0), 0)}
            />
          </div>
        )}
        <MealList logs={logs} emptyText="Bugün henüz bir şey yenmemiş (ya da girilmemiş 😏)" />
      </section>

      {/* Grafikler */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-1 text-lg font-semibold">Son 14 gün</h2>
          <p className="mb-3 text-sm text-ink-2">Günlük alınan ve harcanan kalori</p>
          <CalorieChart data={last14} goal={settings.daily_kcal_goal} />
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="mb-1 text-lg font-semibold">Kilo</h2>
          <p className="mb-3 text-sm text-ink-2">Tüm kayıtlar</p>
          <WeightChart data={weightPoints} target={target} />
        </section>
      </div>

      {/* Son günler */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Son 7 gün</h2>
          <Link href="/gecmis" className="text-sm text-accent hover:underline">Tümü →</Link>
        </div>
        <DayTable rows={summaries.slice(-8, -1).reverse()} />
      </section>
    </div>
  );
}
