"use client";

import { useEffect, useState } from "react";
import { AngryWolf } from "@/components/AngryWolf";
import { WolfMark } from "@/components/Wolf";
import { formatDateTime } from "@/lib/dates";
import { num1 } from "@/lib/format";
import { btnPrimary, inputCls, useAdmin } from "./context";
import type { Inbox } from "./MotivationPopup";

type NoteRow = { id: number; name: string; message: string; hidden: boolean; read_at: string | null; created_at: string };
type Goals = { target_weight: string; daily_kcal_goal: string; status_message: string };

const fmt = new Intl.NumberFormat("tr-TR");

export function Karargah({ inbox, onInboxChange }: { inbox: Inbox; onInboxChange: () => void }) {
  const { supabase, toast, version, bump, goTo } = useAdmin();
  const [counts, setCounts] = useState<{ today: number; total: number } | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [goals, setGoals] = useState<Goals>({ target_weight: "", daily_kcal_goal: "", status_message: "" });
  const [filter, setFilter] = useState<"hepsi" | "yeni">("yeni");

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.rpc("motivation_counts"),
      supabase.from("notes").select("id, name, message, hidden, read_at, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("weights").select("kg").order("log_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("settings").select("target_weight, daily_kcal_goal, status_message").eq("id", 1).maybeSingle(),
    ]).then(([c, n, w, s]) => {
      if (!alive) return;
      const d = (c.data ?? {}) as { today?: number; total?: number };
      setCounts({ today: Number(d.today ?? 0), total: Number(d.total ?? 0) });
      setNotes((n.data ?? []) as NoteRow[]);
      setCurrent(w.data?.kg != null ? Number(w.data.kg) : null);
      if (s.data) {
        setGoals({
          target_weight: s.data.target_weight == null ? "" : String(s.data.target_weight),
          daily_kcal_goal: String(s.data.daily_kcal_goal ?? ""),
          status_message: s.data.status_message ?? "",
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [supabase, version, inbox.unreadCount]);

  async function updateNote(id: number, patch: Partial<NoteRow>) {
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) return toast(error.message, "err");
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    onInboxChange();
  }

  async function removeNote(id: number) {
    if (!confirm("Bu not tamamen silinsin mi?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast(error.message, "err");
    setNotes((ns) => ns.filter((n) => n.id !== id));
    onInboxChange();
  }

  async function markAllRead() {
    const { error } = await supabase.from("notes").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) return toast(error.message, "err");
    toast("Hepsi okundu");
    bump();
  }

  async function saveGoals(e: React.FormEvent) {
    e.preventDefault();
    const num = (s: string) => {
      const v = Number.parseFloat(s.replace(",", "."));
      return Number.isFinite(v) ? v : null;
    };
    const { error } = await supabase
      .from("settings")
      .update({
        target_weight: num(goals.target_weight),
        daily_kcal_goal: Math.round(num(goals.daily_kcal_goal) ?? 2000),
        status_message: goals.status_message.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast("Hedefler güncellendi 🎯");
    bump();
  }

  const today = counts?.today ?? 0;
  const level = today >= 30 ? 4 : today >= 15 ? 3 : today >= 5 ? 2 : today > 0 ? 1 : 0;
  const levelText = ["Sakin bozkır", "Kıpırdanma var", "Kan kaynıyor", "Öfke modu", "TAM GAZ ULUMA"][level];
  const target = Number.parseFloat(goals.target_weight.replace(",", "."));
  const shown = filter === "yeni" ? notes.filter((n) => !n.read_at) : notes;

  return (
    <div className="flex flex-col gap-4">
      {/* Motivasyon kartı */}
      <section
        className={`relative overflow-hidden rounded-3xl border border-line-strong p-5 ${level >= 3 ? "ember" : ""}`}
        style={{
          background: `radial-gradient(circle at 85% 0%, rgba(255,${120 - level * 25},40,${0.12 + level * 0.1}), transparent 60%), var(--surface)`,
        }}
      >
        <div className="relative z-10 max-w-[65%]">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a5c]">Öfke seviyesi</div>
          <div className="mt-1 text-4xl font-black">{fmt.format(today)}</div>
          <div className="text-sm text-ink-2">bugün gaz verildi · toplam {fmt.format(counts?.total ?? 0)}</div>
          <div className="mt-3 flex gap-1" aria-label={`Seviye ${level}/4`}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-2 w-8 rounded-full ${i <= level ? "bg-gradient-to-r from-[#ff4d2e] to-[#ffab2e] shadow-[0_0_10px_rgba(255,77,46,0.7)]" : "bg-white/10"}`} />
            ))}
          </div>
          <div className="mt-1.5 text-sm font-bold">{levelText}</div>
        </div>
        {level >= 2 ? (
          <AngryWolf className="absolute -bottom-4 -right-4 h-40 w-auto opacity-90" />
        ) : (
          <WolfMark className="absolute -bottom-2 right-2 h-32 w-auto opacity-30" glow />
        )}
      </section>

      {/* Hedefler */}
      <form onSubmit={saveGoals} className="card flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">🎯 Hedefler</h2>
          {current != null && Number.isFinite(target) && (
            <span className="text-xs text-muted">Şu an {num1(current)} kg · Kızılelma&apos;ya {num1(Math.max(0, current - target))} kg</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hedef kilo (Kızılelma)
            <input className={inputCls} inputMode="decimal" value={goals.target_weight} onChange={(e) => setGoals((g) => ({ ...g, target_weight: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Günlük kalori sınırı
            <input className={inputCls} inputMode="numeric" value={goals.daily_kcal_goal} onChange={(e) => setGoals((g) => ({ ...g, daily_kcal_goal: e.target.value }))} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sitede görünecek sözün
          <input
            className={inputCls}
            placeholder="ör. Bu sefer geri dönüş yok!"
            maxLength={140}
            value={goals.status_message}
            onChange={(e) => setGoals((g) => ({ ...g, status_message: e.target.value }))}
          />
        </label>
        <button className={btnPrimary}>Kaydet</button>
      </form>

      {/* Hızlı erişim */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <button type="button" onClick={() => goTo("ekle")} className="card py-3">➕<br />Yemek ekle</button>
        <button type="button" onClick={() => goTo("kilo")} className="card py-3">⚖️<br />Kilo gir</button>
        <button type="button" onClick={() => goTo("gun")} className="card py-3">🔥<br />Yakılan kalori</button>
      </div>

      {/* Notlar */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 font-bold">
            📜 Gelen notlar
            {inbox.unreadCount > 0 && <span className="whitespace-nowrap rounded-full bg-[#ff4d2e] px-2 py-0.5 text-xs text-white">{inbox.unreadCount} yeni</span>}
          </h2>
          <div className="flex gap-1 text-xs">
            {(["yeni", "hepsi"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-2.5 py-1 ${filter === f ? "bg-white/10 font-bold" : "text-ink-2"}`}>
                {f === "yeni" ? "Okunmamış" : "Hepsi"}
              </button>
            ))}
          </div>
        </header>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{filter === "yeni" ? "Okunmamış not yok. 🐺" : "Henüz not gelmemiş."}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {shown.map((n) => (
              <li key={n.id} className={`px-4 py-3 ${!n.read_at ? "bg-accent/[0.05]" : ""} ${n.hidden ? "opacity-50" : ""}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {!n.read_at && <span className="mr-1.5 inline-block size-2 rounded-full bg-accent" aria-label="okunmamış" />}
                    {n.name}
                    {n.hidden && <span className="ml-2 text-xs font-normal text-muted">(sitede gizli)</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-2">{n.message}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {!n.read_at && (
                    <button type="button" className="rounded-full border border-line px-2.5 py-1" onClick={() => updateNote(n.id, { read_at: new Date().toISOString() })}>
                      ✓ Okundu
                    </button>
                  )}
                  <button type="button" className="rounded-full border border-line px-2.5 py-1" onClick={() => updateNote(n.id, { hidden: !n.hidden })}>
                    {n.hidden ? "👁 Sitede göster" : "🙈 Sitede gizle"}
                  </button>
                  <button type="button" className="rounded-full border border-line px-2.5 py-1 text-bad" onClick={() => removeNote(n.id)}>
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {inbox.unreadCount > 0 && (
          <div className="border-t border-line p-3 text-center">
            <button type="button" className="text-sm font-semibold text-accent" onClick={markAllRead}>Hepsini okundu yap</button>
          </div>
        )}
      </section>
    </div>
  );
}
