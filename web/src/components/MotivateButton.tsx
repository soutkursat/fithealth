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

const fmt = new Intl.NumberFormat("tr-TR");

export function MotivateButton({ initialToday, initialTotal }: { initialToday: number; initialTotal: number }) {
  const [today, setToday] = useState(initialToday);
  const [total, setTotal] = useState(initialTotal);
  const [fx, setFx] = useState(0);
  const [roar, setRoar] = useState(ROARS[0]);
  const [combo, setCombo] = useState(0);
  const [mounted, setMounted] = useState(false);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sent = useRef<number[]>([]);

  useEffect(() => {
    // Portal hedefi (document) sadece tarayıcıda var.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function motivate() {
    setFx((n) => n + 1);
    setRoar((prev) => {
      let next = prev;
      while (next === prev) next = ROARS[Math.floor(Math.random() * ROARS.length)];
      return next;
    });
    setToday((n) => n + 1);
    setTotal((n) => n + 1);
    setCombo((c) => c + 1);
    navigator.vibrate?.([60, 40, 90]);

    // Sayfayı salla
    const main = document.querySelector("main");
    if (main) {
      main.classList.remove("page-shake");
      void (main as HTMLElement).offsetWidth;
      main.classList.add("page-shake");
    }

    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(0), 2600);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setFx(0), 1750);

    // Sunucuya bildir (dakikada en fazla 30)
    const now = Date.now();
    sent.current = sent.current.filter((t) => now - t < 60_000);
    if (sent.current.length < 30) {
      sent.current.push(now);
      fetch("/api/motivate", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { today?: number; total?: number } | null) => {
          if (!d) return;
          setToday((n) => Math.max(n, d.today ?? 0));
          setTotal((n) => Math.max(n, d.total ?? 0));
        })
        .catch(() => undefined);
    }
  }

  const rage = Math.min(combo / 8, 1);

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={motivate}
          className="ember group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#ff4d2e] via-[#ff6a2b] to-[#ffab2e] px-5 py-3 text-base font-extrabold text-[#1a0603] transition active:scale-95 sm:px-6"
        >
          <span className="text-xl transition-transform group-active:scale-125" aria-hidden>🔥</span>
          Kurt&apos;a motivasyon yükle!
          {combo > 1 && (
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs font-black text-white">x{combo}</span>
          )}
        </button>
        <span className="pl-2 text-xs text-muted" aria-live="polite">
          Bugün <b className="text-ink">{fmt.format(today)}</b> kez gaz verildi · toplam {fmt.format(total)}
        </span>
      </div>

      {mounted &&
        createPortal(
          <>
            {/* Kombo arttıkça site kızarır */}
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-[90] transition-opacity duration-700"
              style={{
                opacity: rage,
                background: "radial-gradient(ellipse at 50% 0%, rgba(255,40,20,0.35), rgba(120,0,0,0.25) 50%, transparent 80%)",
              }}
            />
            {fx > 0 && (
              <div key={fx} aria-hidden className="pointer-events-none fixed inset-0 z-[100] grid place-items-center">
                <div className="rage-flash absolute inset-0" />
                <div className="relative flex flex-col items-center gap-4 px-6">
                  <div className="wolf-shake">
                    <AngryWolf className="wolf-zoom h-[min(58vh,420px)] w-auto" />
                  </div>
                  <p className="roar-pop max-w-md text-center text-2xl font-black uppercase tracking-wide text-white sm:text-4xl">{roar}</p>
                </div>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
