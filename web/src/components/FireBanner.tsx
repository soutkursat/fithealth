const fmt = new Intl.NumberFormat("tr-TR");

/** "Alev alev" günü şeridi: yükselen kıvılcımlar + kısa bir övgü. */
export function FireBanner({ kcal, when = "Bugün" }: { kcal: number; when?: string }) {
  return (
    <div className="fire-banner reveal relative overflow-hidden rounded-2xl px-4 py-3 sm:px-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-full">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="spark"
            style={{
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.37) % 2.4}s`,
              animationDuration: `${2.2 + ((i * 0.29) % 1.4)}s`,
            }}
          />
        ))}
      </div>
      <p className="relative flex items-center gap-2 text-sm font-bold sm:text-base">
        <span className="flame-icon text-xl" aria-hidden>🔥</span>
        <span>
          Alev alev! {when} hareketle <span className="text-[#ffcf6b]">{fmt.format(Math.round(kcal))} kcal</span> yakıldı. Bozkırda iz bırakıyor!
        </span>
      </p>
    </div>
  );
}
