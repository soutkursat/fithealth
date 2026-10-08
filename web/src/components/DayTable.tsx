import Link from "next/link";
import { balance } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { kcal, num1 } from "@/lib/format";
import type { DailySummary } from "@/lib/types";

export function DayTable({ rows }: { rows: DailySummary[] }) {
  if (rows.length === 0) return <p className="card p-6 text-center text-sm text-muted">Kayıt yok.</p>;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm tabular">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Gün</th>
            <th className="px-2 py-2.5 text-right font-medium">Alınan</th>
            <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Harcanan</th>
            <th className="px-2 py-2.5 text-right font-medium">Denge</th>
            <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">Adım</th>
            <th className="px-4 py-2.5 text-right font-medium">Kilo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => {
            const b = balance(r);
            return (
              <tr key={r.log_date} className="hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <Link href={`/gun/${r.log_date}`} className="font-medium hover:underline">
                    {formatDate(r.log_date, { day: "numeric", month: "short", weekday: "short" })}
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right">{r.items > 0 ? kcal(r.kcal_in) : "—"}</td>
                <td className={`hidden px-2 py-2.5 text-right sm:table-cell ${r.total_estimated ? "text-muted" : ""}`} title={r.total_estimated ? "Tahmini (dinlenme) değeri" : undefined}>
                  {r.total_kcal != null && r.total_estimated ? `~${kcal(r.total_kcal)}` : kcal(r.total_kcal)}
                </td>
                <td className={`px-2 py-2.5 text-right font-medium ${b == null ? "text-muted" : b <= 0 ? "text-good" : "text-bad"}`}>
                  {b == null ? "—" : `${b > 0 ? "+" : b < 0 ? "−" : ""}${kcal(Math.abs(b))}`}
                </td>
                <td className="hidden px-2 py-2.5 text-right md:table-cell">{kcal(r.steps)}</td>
                <td className="px-4 py-2.5 text-right">{r.kg != null ? num1(r.kg) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
