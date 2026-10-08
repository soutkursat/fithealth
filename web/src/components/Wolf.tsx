/**
 * Geometrik kurt başı. `glow` gözleri ve kulak içlerini parlatır.
 * Gradyan kimlikleri sabittir; sayfadaki tüm kopyalar aynı tanımı kullanır.
 */
export function WolfMark({ className, glow = false, title }: { className?: string; glow?: boolean; title?: string }) {
  return (
    <svg viewBox="100 60 312 400" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={"wolf-fur"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9edf5" />
          <stop offset="1" stopColor="#8f98aa" />
        </linearGradient>
        <linearGradient id={"wolf-ear"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5aa9ff" />
          <stop offset="1" stopColor="#8b7bff" />
        </linearGradient>
        {glow && (
          <filter id={"wolf-glow"} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path fill={"url(#wolf-fur)"} d="M132,70 L214,178 L122,236 Z" />
      <path fill={"url(#wolf-fur)"} d="M380,70 L298,178 L390,236 Z" />
      <path fill={"url(#wolf-ear)"} d="M146,112 L196,182 L140,214 Z" filter={glow ? "url(#wolf-glow)" : undefined} />
      <path fill={"url(#wolf-ear)"} d="M366,112 L316,182 L372,214 Z" filter={glow ? "url(#wolf-glow)" : undefined} />
      <path fill={"url(#wolf-fur)"} d="M122,214 L200,168 L256,186 L312,168 L390,214 L380,302 L306,366 L256,446 L206,366 L132,302 Z" />
      <path fill="#f7f9fc" d="M206,290 L256,270 L306,290 L284,380 L256,446 L228,380 Z" />
      <g fill={glow ? "#7fd0ff" : "#0b0e14"} filter={glow ? "url(#wolf-glow)" : undefined}>
        <path d="M170,254 L226,262 L214,280 Z" />
        <path d="M342,254 L286,262 L298,280 Z" />
      </g>
      <path fill="#0b0e14" d="M236,400 L276,400 L256,428 Z" />
    </svg>
  );
}

/** Logo: kurt + parıltılı halka. */
export function WolfLogo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-xl bg-[#0b0f17] ring-1 ring-white/10"
      style={{ width: size, height: size, boxShadow: "0 0 18px -4px var(--glow)" }}
    >
      <WolfMark className="h-[72%] w-[72%]" glow />
    </span>
  );
}
