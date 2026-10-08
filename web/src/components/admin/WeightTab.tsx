"use client";

import { useEffect, useState } from "react";
import { formatDate, isoDate } from "@/lib/dates";
import { num1 } from "@/lib/format";
import { btnPrimary, inputCls, minEntryDate, useAdmin } from "./context";

type Row = { log_date: string; kg: number; source: string };

export function WeightTab() {
  const { supabase, date: headerDate, toast, version, bump } = useAdmin();
  const today = isoDate();
  const minDate = minEntryDate(today);
  const [date, setDate] = useState(headerDate);
  const [kg, setKg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("weights")
      .select("log_date, kg, source")
      .gte("log_date", minDate)
      .order("log_date", { ascending: false })
      .then(({ data }) => setRows((data ?? []).map((r) => ({ ...r, kg: Number(r.kg) }))));
  }, [supabase, version, minDate]);

  const existing = rows.find((r) => r.log_date === date);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Number.parseFloat(kg.replace(",", "."));
    if (!Number.isFinite(v) || v < 20 || v > 400) return toast("Geçerli bir kilo gir", "err");
    if (date < minDate || date > today) return toast("Tarih son 6 ay içinde olmalı", "err");
    setSaving(true);
    const { error } = await supabase.from("weights").upsert({ log_date: date, kg: v, source: "manual" }, { onConflict: "log_date" });
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast(`${formatDate(date, { day: "numeric", month: "long" })}: ${num1(v)} kg kaydedildi`);
    setKg("");
    bump();
  }

  async function remove(d: string) {
    if (!confirm(`${formatDate(d, { day: "numeric", month: "long" })} kaydı silinsin mi?`)) return;
    const { error } = await supabase.from("weights").delete().eq("log_date", d);
    if (error) return toast(error.message, "err");
    bump();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={save} className="card flex flex-col gap-3 p-4">
        <h2 className="font-bold">⚖️ Tartı sonucu gir</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tarih <span className="text-xs font-normal text-muted">(6 aya kadar geriye)</span>
            <input className={inputCls} type="date" value={date} min={minDate} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <label className="flex w-32 flex-col gap-1 text-sm font-medium">
            Kilo (kg)
            <input className={`${inputCls} text-lg`} inputMode="decimal" placeholder={existing ? num1(existing.kg) : "92,4"} value={kg} onChange={(e) => setKg(e.target.value)} />
          </label>
        </div>
        {existing && (
          <p className="text-xs text-muted">
            Bu günde zaten {num1(existing.kg)} kg kayıtlı ({existing.source === "manual" ? "elle" : "telefondan"}); yeni değer üzerine yazılır.
          </p>
        )}
        <button className={btnPrimary} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
        <p className="text-xs text-muted">Akıllı tartın Health Connect&apos;e yazıyorsa kilo telefondan da gelir. Elle girdiğin değer telefondan gelenle ezilmez.</p>
      </form>

      <section className="card overflow-hidden">
        <header className="border-b border-line px-4 py-3 text-sm font-bold">Son 6 ay · {rows.length} tartı</header>
        <ul className="divide-y divide-[var(--border)]">
          {rows.length === 0 && <li className="p-4 text-center text-sm text-muted">Henüz kayıt yok.</li>}
          {rows.map((r, i) => {
            const prev = rows[i + 1];
            const diff = prev ? r.kg - prev.kg : null;
            return (
              <li key={r.log_date} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <button type="button" className="text-left" onClick={() => setDate(r.log_date)}>
                  {formatDate(r.log_date, { day: "numeric", month: "long", weekday: "long" })}
                </button>
                <span className="flex items-center gap-3">
                  {diff != null && Math.abs(diff) >= 0.05 && (
                    <span className={`text-xs font-semibold ${diff < 0 ? "text-good" : "text-bad"}`}>
                      {diff < 0 ? "▼" : "▲"} {num1(Math.abs(diff))}
                    </span>
                  )}
                  <span className="text-xs text-muted">{r.source === "manual" ? "elle" : "telefon"}</span>
                  <b>{num1(r.kg)} kg</b>
                  <button type="button" onClick={() => remove(r.log_date)} className="text-bad" aria-label="Sil">✕</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
