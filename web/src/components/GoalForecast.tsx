import type { GoalProjection } from "@/lib/calc";
import { formatDate, withLocative } from "@/lib/dates";
import { num1 } from "@/lib/format";

const fmt = new Intl.NumberFormat("tr-TR");

/** "Bu hızla Kızılelma'ya ne zaman?" kartı. */
export function GoalForecast({ p }: { p: GoalProjection }) {
  if (p.status === "noTarget") return null;

  const basis = (source: "tarti" | "kalori") =>
    source === "tarti" ? "son 6 haftanın tartılarına göre" : "son 2 haftanın kalori hesabına göre";

  let icon = "🍎";
  let title: React.ReactNode;
  let sub: React.ReactNode = null;
  let tone = "border-line bg-white/[0.03]";

  switch (p.status) {
    case "reached":
      icon = "🏆";
      title = "Kızılelma fethedildi!";
      sub = "Yeni hedef koyma vakti, Bozkurt.";
      tone = "border-good/40 bg-good/10";
      break;
    case "noData":
      icon = "⏳";
      title = "Tahmin için biraz daha veri lazım";
      sub = p.reason;
      break;
    case "ok": {
      const date = formatDate(p.etaDate, { day: "numeric", month: "long", year: "numeric" });
      title = (
        <>
          Bu hızla Kızılelma&apos;ya <span className="gradient-text">{withLocative(date)}</span> varılır
        </>
      );
      sub = (
        <>
          Haftada ~{num1(Math.abs(p.weeklyKg))} kg · {fmt.format(p.days)} gün kaldı · {basis(p.source)}
        </>
      );
      tone = "border-accent/30 bg-accent/[0.07]";
      break;
    }
    case "far":
      icon = "🐢";
      title = "Bu hızla Kızılelma 3 yıldan uzak";
      sub = <>Haftada ~{num1(Math.abs(p.weeklyKg))} kg gidiyor; biraz tempo şart. ({basis(p.source)})</>;
      break;
    case "flat":
      icon = "🪨";
      title = "Kilo yerinde sayıyor";
      sub = <>Bu gidişle tarih veremiyorum; kalori açığını biraz büyütmek lazım. ({basis(p.source)})</>;
      break;
    case "up":
      icon = "⚠️";
      title = "Bu gidişle Kızılelma uzaklaşıyor!";
      sub = <>Haftada ~{num1(p.weeklyKg)} kg artış var. Toparlan Bozkurt! ({basis(p.source)})</>;
      tone = "border-bad/40 bg-bad/10";
      break;
  }

  return (
    <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 ${tone}`}>
      <span className="text-2xl leading-none" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p className="font-bold leading-snug">{title}</p>
        {sub && <p className="mt-0.5 text-xs text-ink-2">{sub}</p>}
      </div>
    </div>
  );
}
