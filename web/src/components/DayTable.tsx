import Link from "next/link";
import { balance, burn } from "@/lib/calc";
import { formatDate } from "@/lib/dates";
import { kcal, num1 } from "@/lib/format";
import type { DailySummary } from "@/lib/types";

export function DayTable({ rows }: { rows: DailySummary[] }) {
  if (rows.length === 0) return <p className="glass p-8 text-center text-sm text-muted">Kayıt yok.</p>;
  return (
    <div className="glass reveal overflow-hidden">
      <table className="w-full text-sm tabular">
        <thead className="border-b border-line bg-white/[0.02] text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Gün</th>
            <th className="px-2 py-2.5 text-right font-medium">Yenilen</th>
            <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Yakılan</th>
            <th className="px-2 py-2.5 text-right font-medium" title="Yenilen − yakılan. Eksi: açık (yağ eriyor), artı: fazla.">Hesap</th>
            <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">Adım</th>
            <th className="px-4 py-2.5 text-right font-medium">Kilo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => {
            const b = balance(r);
            const bu = burn(r);
            return (
              <tr key={r.log_date} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <Link href={`/gun/${r.log_date}`} className="font-medium hover:underline">
                    {formatDate(r.log_date, { day: "numeric", month: "long", weekday: "long" })}
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right">{r.items > 0 ? kcal(r.kcal_in) : "—"}</td>
                <td className={`hidden px-2 py-2.5 text-right sm:table-cell ${bu.estimated ? "text-muted" : ""}`} title={bu.estimated ? "Telefon susuyor, tahmini değer" : bu.manual ? "Elle girildi" : undefined}>
                  {bu.kcal != null && bu.estimated ? `~${kcal(bu.kcal)}` : kcal(bu.kcal)}
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
