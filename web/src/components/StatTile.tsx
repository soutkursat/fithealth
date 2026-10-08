export function StatTile({
  label,
  value,
  unit,
  hint,
  tone,
  swatch,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "good" | "bad";
  swatch?: "in" | "out";
}) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 p-4">
      <div className="flex items-center gap-1.5 text-sm text-ink-2">
        {swatch && (
          <span aria-hidden className={`inline-block size-2.5 rounded-sm ${swatch === "in" ? "bg-in" : "bg-out"}`} />
        )}
        {label}
      </div>
      <div className={`text-2xl font-semibold sm:text-3xl ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-2">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
