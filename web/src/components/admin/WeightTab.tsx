"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dates";
import { num1 } from "@/lib/format";
import { btnPrimary, inputCls, useAdmin } from "./context";

type Row = { log_date: string; kg: number; source: string };

export function WeightTab() {
  const { supabase, date, toast, version, bump } = useAdmin();
  const [kg, setKg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("weights")
      .select("log_date, kg, source")
      .order("log_date", { ascending: false })
      .limit(30)
      .then(({ data }) => setRows((data ?? []).map((r) => ({ ...r, kg: Number(r.kg) }))));
  }, [supabase, version]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Number.parseFloat(kg.replace(",", "."));
    if (!Number.isFinite(v) || v < 20 || v > 400) return toast("Geçerli bir kilo gir", "err");
    setSaving(true);
    const { error } = await supabase.from("weights").upsert({ log_date: date, kg: v, source: "manual" }, { onConflict: "log_date" });
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast(`${num1(v)} kg kaydedildi`);
    setKg("");
    bump();
  }

  async function remove(d: string) {
    if (!confirm("Bu kilo kaydı silinsin mi?")) return;
    const { error } = await supabase.from("weights").delete().eq("log_date", d);
    if (error) return toast(error.message, "err");
    bump();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={save} className="card flex flex-col gap-3 p-4">
        <label className="text-sm font-medium">{formatDate(date)} tartı sonucu</label>
        <div className="flex gap-2">
          <input className={`${inputCls} text-lg`} inputMode="decimal" placeholder="ör. 92,4" value={kg} onChange={(e) => setKg(e.target.value)} />
          <button className={btnPrimary} disabled={saving}>Kaydet</button>
        </div>
        <p className="text-xs text-muted">Akıllı tartın Health Connect&apos;e yazıyorsa kilo Android uygulamasıyla otomatik de gelir.</p>
      </form>
      <ul className="card divide-y divide-[var(--border)]">
        {rows.length === 0 && <li className="p-4 text-center text-sm text-muted">Henüz kayıt yok.</li>}
        {rows.map((r) => (
          <li key={r.log_date} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span>{formatDate(r.log_date, { day: "numeric", month: "long", weekday: "short" })}</span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-muted">{r.source === "manual" ? "elle" : "telefon"}</span>
              <b>{num1(r.kg)} kg</b>
              <button type="button" onClick={() => remove(r.log_date)} className="text-bad" aria-label="Sil">✕</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
