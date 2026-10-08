import { Icon, type IconName } from "./Icon";

export function StatTile({
  label,
  value,
  unit,
  hint,
  tone,
  swatch,
  icon,
  meter,
  delay = 0,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "good" | "bad";
  swatch?: "in" | "out";
  icon?: IconName;
  /** 0–100 dolu çubuk (ör. hedefin ne kadarı yendi). */
  meter?: { pct: number; over?: boolean };
  delay?: number;
}) {
  const iconColor = swatch === "in" ? "text-in" : swatch === "out" ? "text-out" : tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-accent";
  return (
    <div className="glass glass-hover reveal flex min-w-0 flex-col gap-1.5 p-4 sm:p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
          {swatch && <span aria-hidden className={`inline-block size-2 rounded-full ${swatch === "in" ? "bg-in" : "bg-out"}`} />}
          {label}
        </span>
        {icon && (
          <span className={`grid size-8 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/5 ${iconColor}`}>
            <Icon name={icon} className="size-4" />
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold tracking-tight sm:text-3xl ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-2">{unit}</span>}
      </div>
      {meter && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`bar-grow h-full rounded-full ${meter.over ? "bg-bad" : "bg-gradient-to-r from-[#5aa9ff] to-[#8b7bff]"}`}
            style={{ width: `${Math.min(100, Math.max(0, meter.pct))}%` }}
          />
        </div>
      )}
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
