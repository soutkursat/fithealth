import { WolfMark } from "./Wolf";
import { MotivateButton } from "./MotivateButton";
import { Icon } from "./Icon";
import { formatDate, withLocative } from "@/lib/dates";
import { KCAL_PER_KG, kcal, num1 } from "@/lib/format";

type Props = {
  name: string;
  current: number | null;
  currentDate: string | null;
  start: number | null;
  target: number | null;
  startDate: string | null;
  /** Kcal deficit over the tracked days (positive = deficit). */
  deficit: number | null;
  trackedDays: number;
  streak: number;
  statusMessage: string | null;
  motivation: { today: number; total: number };
};

const R = 92;
const LEN = 2 * Math.PI * R;

export function WeightHero({ name, current, currentDate, start, target, startDate, deficit, trackedDays, streak, statusMessage, motivation }: Props) {
  const fury = motivation.today >= 10;
  const lost = start != null && current != null ? start - current : null;
  const remaining = current != null && target != null ? Math.max(0, current - target) : null;
  const pct =
    start != null && current != null && target != null && start > target
      ? Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100))
      : null;
  const ringOffset = LEN * (1 - (pct ?? 0) / 100);

  return (
    <section className={`glass glow-border reveal relative overflow-hidden p-5 sm:p-8 ${fury ? "ember" : ""}`} aria-label="Kilo durumu">
      {/* Ay + kurt silueti (dekoratif) */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-[radial-gradient(circle,rgba(191,224,255,0.22),rgba(90,169,255,0.08)_45%,transparent_70%)] breathe sm:-right-10 sm:size-96" />
      <WolfMark className="pointer-events-none absolute -bottom-10 -right-8 h-64 w-auto opacity-[0.06] sm:h-80" />
      {fury && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-[#ff4d2e]/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#ff8a5c] ring-1 ring-[#ff4d2e]/40 sm:left-6 sm:top-6">
          🔥 Öfke modu açık
        </span>
      )}

      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        {/* Halka: güncel kilo */}
        <div className="relative mx-auto grid size-56 place-items-center sm:size-64">
          <svg viewBox="0 0 220 220" className="absolute inset-0 -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#5aa9ff" />
                <stop offset="1" stopColor="#8b7bff" />
              </linearGradient>
            </defs>
            <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            {pct != null && (
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={LEN}
                strokeDashoffset={ringOffset}
                className="ring-progress"
                style={{ ["--ring-len" as string]: LEN, filter: "drop-shadow(0 0 10px rgba(90,169,255,0.55))" }}
              />
            )}
          </svg>
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Güncel kilo</div>
            <div className="mt-1 text-5xl font-bold tracking-tight text-glow sm:text-6xl">
              {current != null ? num1(current) : "—"}
              <span className="ml-1 text-lg font-medium text-ink-2">kg</span>
            </div>
            {pct != null ? (
              <div className="mt-1 text-sm font-semibold text-accent">Yolun %{Math.round(pct)}&apos;i geride</div>
            ) : (
              <div className="mt-1 text-xs text-muted">{current == null ? "İlk tartı bekleniyor" : "Kızılelma henüz belirlenmedi"}</div>
            )}
            {currentDate && <div className="mt-0.5 text-[11px] text-muted">Son tartı: {formatDate(currentDate, { day: "numeric", month: "long" })}</div>}
          </div>
        </div>

        {/* Sağ taraf: özet */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-2">
            {name} {startDate ? `${withLocative(formatDate(startDate, { day: "numeric", month: "long" }))} sefere çıktı. O günden beri eriyen:` : "sefere çıktı. Şimdiye kadar eriyen:"}
          </p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight sm:text-7xl">
            <span className={lost != null && lost > 0 ? "gradient-text" : ""}>
              {lost != null ? `${lost > 0 ? "−" : lost < 0 ? "+" : ""}${num1(Math.abs(lost))}` : "—"}
            </span>
            <span className="ml-2 text-xl font-semibold text-ink-2 sm:text-2xl">kg</span>
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {remaining != null && remaining > 0
              ? <>Kızılelma&apos;ya <b className="text-ink">{num1(remaining)} kg</b> kaldı 🍎</>
              : remaining === 0
                ? <b className="text-good">Kızılelma fethedildi! Ne mutlu zayıflayana! 🐺</b>
                : "Bozkurt yolda."}
          </p>

          {/* Yolculuk çubuğu: başlangıç → şimdi → hedef */}
          {pct != null && (
            <div className="mt-6">
              <div className="relative h-2.5 rounded-full bg-white/[0.06]">
                <div
                  className="bar-grow absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5aa9ff] to-[#8b7bff]"
                  style={{ width: `${pct}%`, boxShadow: "0 0 16px rgba(90,169,255,0.55)" }}
                />
                <div
                  className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0b0f17] ring-2 ring-accent float"
                  style={{ left: `${Math.min(97, Math.max(3, pct))}%`, boxShadow: "0 0 18px var(--glow)" }}
                  title={`Şu an ${num1(current)} kg`}
                >
                  <WolfMark className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex justify-between text-xs">
                <div>
                  <div className="text-muted">Sefer başı</div>
                  <div className="text-base font-semibold">{num1(start)} kg</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-muted"><Icon name="target" className="size-3.5" />Kızılelma</div>
                  <div className="text-base font-semibold text-good">{num1(target)} kg</div>
                </div>
              </div>
            </div>
          )}

          {statusMessage && (
            <blockquote className="mt-5 border-l-2 border-accent/60 pl-3 text-sm italic text-ink-2">
              “{statusMessage}” <span className="not-italic text-muted">— {name}</span>
            </blockquote>
          )}

          {/* Rozetler */}
          <div className="mt-5 flex flex-wrap gap-2">
            {deficit != null && trackedDays > 0 && (
              <Chip icon="fire">
                {deficit >= 0 ? (
                  <>30 günde <b className="text-ink">{kcal(deficit)} kcal</b> açık ≈ <b className="text-good">{num1(deficit / KCAL_PER_KG)} kg yağ</b> eridi</>
                ) : (
                  <>30 günde <b className="text-ink">{kcal(-deficit)} kcal</b> fazla kaçtı</>
                )}
              </Chip>
            )}
            {streak > 1 && (
              <Chip icon="trend">
                <b className="text-ink">{streak} gündür</b> geri adım yok
              </Chip>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <MotivateButton initialToday={motivation.today} initialTotal={motivation.total} />
            <a
              href="#istatistikler"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-5 py-3 text-sm font-bold transition hover:bg-white/[0.08]"
            >
              📊 Rakamlara in <span aria-hidden>↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, children }: { icon: "fire" | "trend"; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-ink-2">
      <Icon name={icon} className="size-3.5 text-accent" />
      <span>{children}</span>
    </span>
  );
}
