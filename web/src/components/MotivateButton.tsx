"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AngryWolf } from "./AngryWolf";

const ROARS = [
  "Kalk o koltuktan, Bozkurt!",
  "Ergenekon'dan çıktık, bu kilolardan da çıkarız!",
  "Kızılelma'ya az kaldı, durmak yok!",
  "Ne mutlu zayıflayana!",
  "O baklavayı bırak, yiğidim!",
  "Bozkurt diyet yapar, geri adım atmaz!",
  "Ecdat bozkırı yürüdü, sen de 10 bin adım at!",
  "Bu göbek Malazgirt'te bile duramazdı, eritiyoruz!",
  "Tarih yazıyoruz, kalori yakıyoruz!",
  "AUUUUUU! 🐺🔥",
];

/** Her basışta butonda yazan şey (0 = boşta). */
const STEPS = [
  "Kurt'a motivasyon yükle!",
  "Kurt kulak kabarttı…",
  "Tüyler diken diken…",
  "Dişler göründü…",
  "Bir gaz daha, salıyoruz!",
];
const CHARGE = 5;
/** Boşta kalınca dolum sıfırlanır. */
const IDLE_MS = 6000;

/** Yazı uzunluğuna göre ekranda kalma süresi (okunabilsin diye). */
function readMs(text: string): number {
  return Math.min(6000, Math.max(2600, 1600 + text.length * 70));
}

const fmt = new Intl.NumberFormat("tr-TR");

export function MotivateButton({ initialToday, initialTotal }: { initialToday: number; initialTotal: number }) {
  const [today, setToday] = useState(initialToday);
  const [total, setTotal] = useState(initialTotal);
  const [charge, setCharge] = useState(0);
  const [fx, setFx] = useState<{ id: number; roar: string; ms: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRoar = useRef("");
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Portal hedefi (document) sadece tarayıcıda var.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function release() {
    let roar = lastRoar.current;
    while (roar === lastRoar.current) roar = ROARS[Math.floor(Math.random() * ROARS.length)];
    lastRoar.current = roar;
    const ms = readMs(roar);
    setFx({ id: Date.now(), roar, ms });
    setToday((n) => n + 1);
    setTotal((n) => n + 1);
    navigator.vibrate?.([80, 40, 120]);

    const main = document.querySelector("main");
    if (main) {
      main.classList.remove("page-shake");
      void (main as HTMLElement).offsetWidth;
      main.classList.add("page-shake");
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setFx(null), ms + 100);

    fetch("/api/motivate", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { today?: number; total?: number } | null) => {
        if (!d) return;
        setToday((n) => Math.max(n, d.today ?? 0));
        setTotal((n) => Math.max(n, d.total ?? 0));
      })
      .catch(() => undefined);
  }

  function press() {
    if (fx) return; // efekt bitmeden yeni yükleme yok
    const next = charge + 1;
    navigator.vibrate?.(25);
    const b = btnRef.current;
    if (b) {
      b.classList.remove("btn-thump");
      void b.offsetWidth;
      b.classList.add("btn-thump");
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (next >= CHARGE) {
      setCharge(0);
      release();
    } else {
      setCharge(next);
      idleTimer.current = setTimeout(() => setCharge(0), IDLE_MS);
    }
  }

  const pct = (charge / CHARGE) * 100;

  return (
    <>
      <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto">
        <button
          ref={btnRef}
          type="button"
          onClick={press}
          aria-label={`Kurt'a motivasyon yükle (${charge}/${CHARGE})`}
          className="ember relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[#ff4d2e] via-[#ff6a2b] to-[#ffab2e] px-5 py-3 text-left text-base font-extrabold text-[#1a0603] transition active:scale-95 sm:w-[22rem] sm:px-6"
        >
          {/* Yükleme barı (düşük opaklık) */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-white/30 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
          <span className="relative flex items-center gap-2">
            <span className="text-xl" aria-hidden>🔥</span>
            <span className="min-w-0 flex-1 leading-tight">{STEPS[charge]}</span>
            {charge > 0 && <span className="shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-xs font-black text-white">{charge}/{CHARGE}</span>}
          </span>
        </button>
        <span className="pl-2 text-xs text-muted" aria-live="polite">
          Bugün <b className="text-ink">{fmt.format(today)}</b> kez gaz verildi · toplam {fmt.format(total)}
        </span>
      </div>

      {mounted &&
        fx &&
        createPortal(
          <div
            key={fx.id}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 overflow-hidden px-4"
            style={{ ["--fx-ms" as string]: `${fx.ms}ms` }}
          >
            <div className="rage-flash absolute inset-0" />
            <div className="wolf-shake relative flex w-full justify-center">
              <AngryWolf className="wolf-zoom block h-auto w-[min(72vw,52vh,380px)]" />
            </div>
            <p className="roar-pop relative w-full max-w-[min(92vw,34rem)] text-balance break-words text-center text-2xl font-black uppercase leading-tight tracking-wide text-white sm:text-4xl">
              {fx.roar}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
