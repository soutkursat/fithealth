"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, inputCls, useAdmin } from "./context";

export function SettingsTab({ onSignOut }: { onSignOut: () => void }) {
  const { supabase, toast } = useAdmin();
  const [f, setF] = useState({ display_name: "", daily_kcal_goal: "", start_weight: "", target_weight: "", start_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setF({
          display_name: data.display_name ?? "",
          daily_kcal_goal: String(data.daily_kcal_goal ?? ""),
          start_weight: data.start_weight == null ? "" : String(data.start_weight),
          target_weight: data.target_weight == null ? "" : String(data.target_weight),
          start_date: data.start_date ?? "",
        });
      });
  }, [supabase]);

  const num = (s: string) => {
    const v = Number.parseFloat(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({
        display_name: f.display_name.trim() || "Kurt",
        daily_kcal_goal: Math.round(num(f.daily_kcal_goal) ?? 2000),
        start_weight: num(f.start_weight),
        target_weight: num(f.target_weight),
        start_date: f.start_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast("Ayarlar kaydedildi");
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={save} className="card flex flex-col gap-3 p-4">
      <L label="Sitede görünen isim"><input className={inputCls} value={f.display_name} onChange={set("display_name")} /></L>
      <L label="Günlük kalori hedefi (kcal)"><input className={inputCls} inputMode="numeric" value={f.daily_kcal_goal} onChange={set("daily_kcal_goal")} /></L>
      <div className="grid grid-cols-2 gap-3">
        <L label="Başlangıç kilosu"><input className={inputCls} inputMode="decimal" value={f.start_weight} onChange={set("start_weight")} /></L>
        <L label="Hedef kilo"><input className={inputCls} inputMode="decimal" value={f.target_weight} onChange={set("target_weight")} /></L>
      </div>
      <L label="Başlangıç tarihi"><input className={inputCls} type="date" value={f.start_date} onChange={set("start_date")} /></L>
      <button className={btnPrimary} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      <button type="button" className={btnGhost} onClick={onSignOut}>Çıkış yap</button>
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
