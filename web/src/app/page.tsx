import { Suspense } from "react";
import Link from "next/link";
import { SectionTitle, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeightHero } from "@/components/WeightHero";
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
import { kcal } from "@/lib/format";

export default function Home() {
  return (
    <>
      <SiteHeader active="bugun" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
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

  // Kilo
  const last = weights.at(-1);
  const start = settings.start_weight ?? weights[0]?.kg ?? null;

  // Son 30 günün kalori açığı (iki taraf da gerçek veriyle kayıtlı günler)
  const tracked = summaries.map(balance).filter((b): b is number => b != null);
  const deficit = tracked.length ? -tracked.reduce((s, b) => s + b, 0) : null;

  // Üst üste kalori açığında geçen gün sayısı (bugün henüz bitmediği için dünden geriye)
  let streak = 0;
  for (let i = summaries.length - 2; i >= 0; i--) {
    const b = balance(summaries[i]);
    if (b == null || b >= 0) break;
    streak++;
  }
  if (bal != null && bal < 0) streak++;

  const last14 = summaries.slice(-14).map((s) => ({
    date: s.log_date,
    label: shortDate(s.log_date),
    in: s.items > 0 ? Math.round(s.kcal_in) : null,
    out: s.total_kcal != null && !s.total_estimated ? Math.round(s.total_kcal) : null,
  }));
  const weightPoints = weights.map((w) => ({ date: w.log_date, label: shortDate(w.log_date), kg: w.kg }));
  const goalPct = settings.daily_kcal_goal > 0 ? (kcalIn / settings.daily_kcal_goal) * 100 : 0;

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <WeightHero
        name={settings.display_name}
        current={last?.kg ?? null}
        currentDate={last?.log_date ?? null}
        start={start}
        target={settings.target_weight}
        startDate={settings.start_date ?? weights[0]?.log_date ?? null}
        deficit={deficit}
        trackedDays={tracked.length}
        streak={streak}
      />

      {/* Bugün */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="Bugün"
          sub={formatDate(today)}
          right={
            lastSync && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-good shadow-[0_0_8px_var(--good)]" />
                Telefon senkronu {formatDateTime(lastSync)}
              </span>
            )
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Alınan"
            swatch="in"
            icon="fork"
            value={kcal(kcalIn)}
            unit="kcal"
            meter={{ pct: goalPct, over: goalPct > 100 }}
            hint={`Hedef ${kcal(settings.daily_kcal_goal)} kcal`}
            delay={60}
          />
          <StatTile
            label="Harcanan"
            swatch="out"
            icon="flame"
            value={todaySum.total_kcal != null && todaySum.total_estimated ? `~${kcal(todaySum.total_kcal)}` : kcal(todaySum.total_kcal)}
            unit="kcal"
            hint={
              todaySum.total_estimated
                ? "Tahmini (dinlenme) değeri"
                : todaySum.active_kcal != null
                  ? `Aktif ${kcal(todaySum.active_kcal)} kcal`
                  : "Telefondan gelecek"
            }
            delay={120}
          />
          <StatTile
            label="Denge"
            icon="scale"
            value={bal == null ? "—" : `${bal > 0 ? "+" : bal < 0 ? "−" : ""}${kcal(Math.abs(bal))}`}
            unit="kcal"
            tone={bal == null ? undefined : bal <= 0 ? "good" : "bad"}
            hint={bal == null ? "Alınan − harcanan" : bal <= 0 ? "Kalori açığında 👍" : "Kalori fazlasında"}
            delay={180}
          />
          <StatTile
            label={remaining >= 0 ? "Kalan hak" : "Hedef aşıldı"}
            icon={remaining >= 0 ? "target" : "fire"}
            value={kcal(Math.abs(remaining))}
            unit="kcal"
            tone={remaining >= 0 ? undefined : "bad"}
            hint={todaySum.steps != null ? `${kcal(todaySum.steps)} adım` : "Günlük hedefe göre"}
            delay={240}
          />
        </div>
        {kcalIn > 0 && (
          <div className="glass reveal p-4 sm:p-5" style={{ ["--d" as string]: "300ms" }}>
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
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass reveal p-4 sm:p-6">
          <h2 className="text-lg font-bold">Son 14 gün</h2>
          <p className="mb-4 text-sm text-ink-2">Günlük alınan ve harcanan kalori</p>
          <CalorieChart data={last14} goal={settings.daily_kcal_goal} />
        </section>
        <section className="glass reveal p-4 sm:p-6" style={{ ["--d" as string]: "80ms" }}>
          <h2 className="text-lg font-bold">Kilo grafiği</h2>
          <p className="mb-4 text-sm text-ink-2">Tüm tartılar</p>
          <WeightChart data={weightPoints} target={settings.target_weight} />
        </section>
      </div>

      {/* Son günler */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="Son 7 gün"
          right={<Link href="/gecmis" className="text-sm font-semibold text-accent hover:underline">Tüm geçmiş →</Link>}
        />
        <DayTable rows={summaries.slice(-8, -1).reverse()} />
      </section>
    </div>
  );
}
