import { Suspense } from "react";
import Link from "next/link";
import { SectionTitle, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeightHero } from "@/components/WeightHero";
import { StatTile } from "@/components/StatTile";
import { MacroBar } from "@/components/MacroBar";
import { MealList } from "@/components/MealList";
import { CalorieExplorer, type ExplorerDay } from "@/components/CalorieExplorer";
import { RecentDays, type RecentDay } from "@/components/RecentDays";
import { NotesSection } from "@/components/NotesSection";
import { WeightChart } from "@/components/WeightChart";
import { PageSkeleton, SetupNotice } from "@/components/Setup";
import { getDashboard } from "@/lib/data";
import { balance, burn } from "@/lib/calc";
import { isConfigured } from "@/lib/supabase";
import { dayLabel, formatDate, formatDateTime, shortDate } from "@/lib/dates";
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
  const { today, settings, logs, weekLogs, summaries, weights, lastSync, notes, motivation } = await getDashboard();
  const todaySum = summaries[summaries.length - 1];
  const kcalIn = logs.reduce((s, l) => s + l.kcal, 0);
  const remaining = settings.daily_kcal_goal - kcalIn;
  const todayBurn = burn(todaySum);
  const bal = balance({ ...todaySum, kcal_in: kcalIn, items: logs.length });

  // Kilo
  const last = weights.at(-1);
  const start = settings.start_weight ?? weights[0]?.kg ?? null;

  // Son 30 günün kalori açığı (iki taraf da gerçek veriyle kayıtlı günler)
  const tracked = summaries.map(balance).filter((b): b is number => b != null);
  const deficit = tracked.length ? -tracked.reduce((s, b) => s + b, 0) : null;

  // Üst üste açık verilen gün sayısı (bugün bitmediği için dünden geriye)
  let streak = 0;
  for (let i = summaries.length - 2; i >= 0; i--) {
    const b = balance(summaries[i]);
    if (b == null || b >= 0) break;
    streak++;
  }
  if (bal != null && bal < 0) streak++;

  const explorer: ExplorerDay[] = summaries.map((s) => {
    const b = burn(s);
    return {
      date: s.log_date,
      label: shortDate(s.log_date),
      longLabel: dayLabel(s.log_date, today),
      in: s.items > 0 ? Math.round(s.kcal_in) : null,
      out: b.kcal != null && !b.estimated ? Math.round(b.kcal) : null,
      bal: balance(s),
      estimated: b.estimated,
    };
  });

  const recent: RecentDay[] = summaries
    .slice(-8, -1)
    .reverse()
    .map((s) => {
      const b = burn(s);
      return {
        date: s.log_date,
        label: dayLabel(s.log_date, today),
        in: s.items > 0 ? Math.round(s.kcal_in) : null,
        out: b.kcal != null ? Math.round(b.kcal) : null,
        bal: balance(s),
        estimated: b.estimated,
        steps: s.steps,
        kg: s.kg,
        protein: s.protein,
        carbs: s.carbs,
        fat: s.fat,
        foods: weekLogs.filter((l) => l.log_date === s.log_date).map((l) => ({ name: l.name, kcal: l.kcal, meal: l.meal })),
      };
    });

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
        statusMessage={settings.status_message}
        motivation={motivation}
      />

      {settings.show_notes && <NotesSection initialNotes={notes} />}

      {/* Bugün */}
      <section id="istatistikler" className="flex flex-col gap-4">
        <SectionTitle
          title="Bugünün cephe raporu"
          sub={formatDate(today)}
          right={
            lastSync && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-good shadow-[0_0_8px_var(--good)]" />
                Telefondan son haber: {formatDateTime(lastSync)}
              </span>
            )
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Yenilen"
            swatch="in"
            icon="fork"
            value={kcal(kcalIn)}
            unit="kcal"
            meter={{ pct: goalPct, over: goalPct > 100 }}
            hint={`Günlük sınır ${kcal(settings.daily_kcal_goal)} kcal`}
            delay={60}
          />
          <StatTile
            label="Yakılan"
            swatch="out"
            icon="flame"
            value={todayBurn.kcal != null && todayBurn.estimated ? `~${kcal(todayBurn.kcal)}` : kcal(todayBurn.kcal)}
            unit="kcal"
            hint={
              todayBurn.estimated
                ? "Telefon susuyor, bu tahmini"
                : todayBurn.manual
                  ? "Elle girildi"
                  : todaySum.active_kcal != null
                    ? `Hareketle ${kcal(todaySum.active_kcal + todayBurn.extra)} kcal`
                    : "Telefondan bekleniyor"
            }
            delay={120}
          />
          <StatTile
            label="Günün hesabı"
            icon="scale"
            value={bal == null ? "—" : `${bal > 0 ? "+" : bal < 0 ? "−" : ""}${kcal(Math.abs(bal))}`}
            unit="kcal"
            tone={bal == null ? undefined : bal <= 0 ? "good" : "bad"}
            hint={bal == null ? "Yenilen − yakılan" : bal <= 0 ? "Açık verildi, yağ eriyor 🔥" : "Fazla kaçtı, yarın telafi"}
            delay={180}
          />
          <StatTile
            label={remaining >= 0 ? "Kalan erzak" : "Sınır aşıldı"}
            icon={remaining >= 0 ? "target" : "fire"}
            value={kcal(Math.abs(remaining))}
            unit="kcal"
            tone={remaining >= 0 ? undefined : "bad"}
            hint={todaySum.steps != null ? `👣 ${kcal(todaySum.steps)} adım` : "Bugün yenebilecek kalan"}
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
        <MealList logs={logs} emptyText="Bugün sofraya henüz oturulmadı (ya da Kurt saklıyor 😏)" />
      </section>

      {/* Kalori */}
      <section className="glass reveal p-4 sm:p-6">
        <h2 className="text-xl font-bold tracking-tight">Kalori cephesi</h2>
        <p className="mb-4 text-sm text-ink-2">Her günün hesabı: yenilen eksi yakılan. Bir çubuğa dokun, o günü anlatayım.</p>
        <CalorieExplorer days={explorer} goal={settings.daily_kcal_goal} />
      </section>

      {/* Kilo */}
      <section className="glass reveal p-4 sm:p-6">
        <h2 className="text-xl font-bold tracking-tight">Kilo seyri</h2>
        <p className="mb-4 text-sm text-ink-2">Bütün tartılar; kesikli çizgi Kızılelma.</p>
        <WeightChart data={weightPoints} target={settings.target_weight} />
      </section>

      {/* Son günler */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="Son 7 gün"
          sub="Bir güne dokun, sofrada ne varmış gör."
          right={<Link href="/gecmis" className="text-sm font-semibold text-accent hover:underline">Bütün geçmiş →</Link>}
        />
        <RecentDays days={recent} />
      </section>
    </div>
  );
}
