import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { DayTable } from "@/components/DayTable";
import { StatTile } from "@/components/StatTile";
import { PageSkeleton, SetupNotice } from "@/components/Setup";
import { getHistory } from "@/lib/data";
import { balance, burn } from "@/lib/calc";
import { isConfigured } from "@/lib/supabase";
import { KCAL_PER_KG, kcal, num1 } from "@/lib/format";

export const metadata: Metadata = { title: "Geçmiş" };

export default function HistoryPage() {
  return (
    <>
      <SiteHeader active="gecmis" />
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-8">
        {isConfigured ? (
          <Suspense fallback={<PageSkeleton />}>
            <History />
          </Suspense>
        ) : (
          <SetupNotice />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function History() {
  const { summaries, settings } = await getHistory();
  const withFood = summaries.filter((s) => s.items > 0);
  const avgIn = withFood.length ? withFood.reduce((s, r) => s + r.kcal_in, 0) / withFood.length : null;
  const burns = summaries.map(burn).filter((b) => b.kcal != null && !b.estimated);
  const avgOut = burns.length ? burns.reduce((s, b) => s + (b.kcal ?? 0), 0) / burns.length : null;
  const balances = summaries.map(balance).filter((b): b is number => b != null);
  const deficit = -balances.reduce((s, b) => s + b, 0);
  const goalDays = withFood.filter((r) => r.kcal_in <= settings.daily_kcal_goal).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl"><span className="gradient-text">Geçmiş</span></h1>
        <p className="mt-1 text-sm text-ink-2">Seferin bütün günleri, gün gün. Bir güne dokun, ayrıntısı açılsın.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Günlük ort. yenilen" swatch="in" icon="fork" value={kcal(avgIn)} unit="kcal" hint={`${withFood.length} günün sofrası kayıtlı`} />
        <StatTile label="Günlük ort. yakılan" swatch="out" icon="flame" delay={60} value={kcal(avgOut)} unit="kcal" hint={`${burns.length} gün telefondan geldi`} />
        <StatTile
          label={deficit >= 0 ? "Toplam açık" : "Toplam fazla"}
          icon="trend"
          delay={120}
          value={kcal(Math.abs(deficit))}
          unit="kcal"
          tone={balances.length ? (deficit >= 0 ? "good" : "bad") : undefined}
          hint={balances.length ? `≈ ${num1(Math.abs(deficit) / KCAL_PER_KG)} kg yağ${deficit >= 0 ? " eridi" : ""}` : undefined}
        />
        <StatTile label="Sınırı aşmadığı gün" icon="calendar" delay={180} value={`${goalDays}/${withFood.length}`} hint={`Günlük sınır ${kcal(settings.daily_kcal_goal)} kcal`} />
      </div>
      <DayTable rows={summaries} />
    </div>
  );
}
