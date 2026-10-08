"use client";

import { useEffect, useState } from "react";
import { burn } from "@/lib/calc";
import { kcal } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls, useAdmin } from "./context";

type Phone = { total_kcal: number | null; active_kcal: number | null; steps: number | null; total_estimated: boolean; sources: string[] | null } | null;
type Extra = { id: number; kcal: number; note: string | null };

const num = (s: string) => {
  const v = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

/**
 * Yakılan kalori: telefondan gelen veri salt okunur gösterilir; elle girilenler
 * ayrı tablolarda tutulur ve telefon verisinin üzerine asla yazılmaz.
 */
export function BurnSection() {
  const { supabase, date, toast, version, bump } = useAdmin();
  const [phone, setPhone] = useState<Phone>(null);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [totalInput, setTotalInput] = useState("");
  const [extraKcal, setExtraKcal] = useState("");
  const [extraNote, setExtraNote] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from("daily_activity").select("total_kcal, active_kcal, steps, total_estimated, sources").eq("log_date", date).maybeSingle(),
      supabase.from("manual_day_totals").select("total_kcal").eq("log_date", date).maybeSingle(),
      supabase.from("manual_burns").select("id, kcal, note").eq("log_date", date).order("created_at"),
    ]).then(([p, t, e]) => {
      if (!alive) return;
      setPhone(
        p.data
          ? {
              total_kcal: p.data.total_kcal == null ? null : Number(p.data.total_kcal),
              active_kcal: p.data.active_kcal == null ? null : Number(p.data.active_kcal),
              steps: p.data.steps,
              total_estimated: p.data.total_estimated === true,
              sources: p.data.sources ?? null,
            }
          : null,
      );
      const mt = t.data?.total_kcal == null ? null : Number(t.data.total_kcal);
      setManualTotal(mt);
      setTotalInput(mt == null ? "" : String(mt));
      setExtras((e.data ?? []).map((x) => ({ ...x, kcal: Number(x.kcal) })) as Extra[]);
    });
    return () => {
      alive = false;
    };
  }, [supabase, date, version]);

  const eff = burn({
    total_kcal: phone?.total_kcal ?? null,
    total_estimated: phone?.total_estimated ?? false,
    manual_total_kcal: manualTotal,
    extra_kcal: extras.reduce((s, x) => s + x.kcal, 0) || null,
  });
  const phoneReal = phone?.total_kcal != null && !phone.total_estimated;

  async function saveTotal(e: React.FormEvent) {
    e.preventDefault();
    const v = num(totalInput);
    if (v == null || v <= 0 || v > 15000) return toast("Geçerli bir kalori gir", "err");
    const { error } = await supabase.from("manual_day_totals").upsert({ log_date: date, total_kcal: v, updated_at: new Date().toISOString() }, { onConflict: "log_date" });
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast("Günlük toplam kaydedildi");
    bump();
  }

  async function clearTotal() {
    const { error } = await supabase.from("manual_day_totals").delete().eq("log_date", date);
    if (error) return toast(error.message, "err");
    toast("Elle girilen toplam kaldırıldı");
    bump();
  }

  async function addExtra(e: React.FormEvent) {
    e.preventDefault();
    const v = num(extraKcal);
    if (v == null || v <= 0 || v > 10000) return toast("Geçerli bir kalori gir", "err");
    const { error } = await supabase.from("manual_burns").insert({ log_date: date, kcal: v, note: extraNote.trim() || null });
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast(`+${kcal(v)} kcal eklendi 💪`);
    setExtraKcal("");
    setExtraNote("");
    bump();
  }

  async function removeExtra(id: number) {
    const { error } = await supabase.from("manual_burns").delete().eq("id", id);
    if (error) return toast(error.message, "err");
    bump();
  }

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">🔥 Yakılan kalori</h2>
        <span className="text-sm">
          Sitede: <b>{eff.kcal == null ? "—" : `${eff.estimated ? "~" : ""}${kcal(eff.kcal)} kcal`}</b>
        </span>
      </div>

      {/* Telefon verisi (salt okunur) */}
      <div className="rounded-xl border border-line bg-white/[0.02] p-3 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">📱 Telefondan gelen (değiştirilemez)</div>
        {phone ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Toplam: <b>{phone.total_kcal == null ? "—" : `${phone.total_estimated ? "~" : ""}${kcal(phone.total_kcal)}`}</b>{phone.total_estimated && <span className="text-warn"> (tahmini)</span>}</span>
            <span>Hareket: <b>{kcal(phone.active_kcal)}</b></span>
            <span>Adım: <b>{kcal(phone.steps)}</b></span>
          </div>
        ) : (
          <p className="text-muted">Bu gün için telefondan veri gelmemiş.</p>
        )}
      </div>

      {/* Ek aktivite */}
      <form onSubmit={addExtra} className="flex flex-col gap-2">
        <div className="text-sm font-semibold">Ek aktivite ekle <span className="font-normal text-muted">(telefonun görmediği spor vb., toplama eklenir)</span></div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <input className={inputCls} inputMode="decimal" placeholder="kcal" value={extraKcal} onChange={(e) => setExtraKcal(e.target.value)} />
          <input className={inputCls} placeholder="ör. Halı saha, yüzme" maxLength={80} value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
        </div>
        <button className={btnPrimary}>Ekle</button>
        {extras.length > 0 && (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-line text-sm">
            {extras.map((x) => (
              <li key={x.id} className="flex items-center justify-between px-3 py-2">
                <span>{x.note ?? "Ek aktivite"}</span>
                <span className="flex items-center gap-3">
                  <b>+{kcal(x.kcal)}</b>
                  <button type="button" className="text-bad" onClick={() => removeExtra(x.id)} aria-label="Sil">✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Günlük toplam (yedek) */}
      <form onSubmit={saveTotal} className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="text-sm font-semibold">Günlük toplamı elle gir</div>
        <p className="text-xs text-muted">
          {phoneReal
            ? "Bu gün telefondan gerçek veri var; elle girilen toplam kaydedilir ama kullanılmaz (telefon verisi önceliklidir)."
            : "Telefondan gerçek veri gelmeyen günlerde bu değer kullanılır. Telefon verisi gelirse otomatik olarak o geçer."}
        </p>
        <div className="flex gap-2">
          <input className={inputCls} inputMode="decimal" placeholder="ör. 2400" value={totalInput} onChange={(e) => setTotalInput(e.target.value)} />
          <button className={`${btnPrimary} shrink-0`}>Kaydet</button>
          {manualTotal != null && (
            <button type="button" className={`${btnGhost} shrink-0`} onClick={clearTotal}>Kaldır</button>
          )}
        </div>
      </form>
    </section>
  );
}
