"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getBrowserClient, isConfigured } from "@/lib/supabase";
import { addDays, formatDate, isoDate } from "@/lib/dates";
import { WolfLogo } from "@/components/Wolf";
import { AdminContext, btnPrimary, inputCls, minEntryDate, type Tab } from "./context";
import { AddFood } from "./AddFood";
import { DayLog } from "./DayLog";
import { WeightTab } from "./WeightTab";
import { SettingsTab } from "./SettingsTab";
import { Karargah } from "./Karargah";
import { MotivationPopup, type Inbox } from "./MotivationPopup";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "karargah", label: "Karargâh", icon: "🐺" },
  { key: "ekle", label: "Ekle", icon: "➕" },
  { key: "gun", label: "Gün", icon: "📋" },
  { key: "kilo", label: "Kilo", icon: "⚖️" },
  { key: "ayarlar", label: "Ayarlar", icon: "⚙️" },
];

const SEEN_KEY = "kurt-motivasyon-goruldu";
const POLL_MS = 30_000;

export function AdminApp() {
  if (!isConfigured) {
    return <p className="p-6 text-center text-sm text-muted">Supabase ortam değişkenleri eksik. README&apos;ye bak.</p>;
  }
  return <AdminInner />;
}

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? new Date(Date.now() - 86_400_000).toISOString();
  } catch {
    return new Date(Date.now() - 86_400_000).toISOString();
  }
}

function AdminInner() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("karargah");
  const [today, setToday] = useState(() => isoDate());
  const [date, setDate] = useState(() => isoDate());
  const [version, setVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [inbox, setInbox] = useState<Inbox>({ unreadNotes: [], unreadCount: 0, newMotivations: 0 });
  const [popup, setPopup] = useState(false);
  const notified = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [supabase, userId]);

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToastMsg({ msg, kind });
    setTimeout(() => setToastMsg((t) => (t?.msg === msg ? null : t)), kind === "err" ? 5000 : 2500);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Bildirimler: okunmamış notlar + son görülmeden beri gelen motivasyonlar
  const poll = useCallback(async () => {
    const seen = readSeen();
    const [notesRes, motRes] = await Promise.all([
      supabase
        .from("notes")
        .select("id, name, message, created_at", { count: "exact" })
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("motivations").select("id", { count: "exact", head: true }).gt("created_at", seen),
    ]);
    const next: Inbox = {
      unreadNotes: (notesRes.data ?? []) as Inbox["unreadNotes"],
      unreadCount: notesRes.count ?? 0,
      newMotivations: motRes.count ?? 0,
    };
    setInbox(next);
    setToday(isoDate());
    const signal = next.newMotivations + next.unreadCount;
    if (signal > notified.current) {
      notified.current = signal;
      setPopup(true);
    }
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAdmin, poll, version]);

  function dismissPopup() {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      /* önemli değil */
    }
    notified.current = inbox.unreadCount;
    setInbox((i) => ({ ...i, newMotivations: 0 }));
    setPopup(false);
  }

  if (session === undefined) return <p className="p-10 text-center text-sm text-muted">Yükleniyor…</p>;
  if (!session) return <Login />;
  if (isAdmin === null) return <p className="p-10 text-center text-sm text-muted">Yetki kontrol ediliyor…</p>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm p-6 text-center text-sm">
        <p className="mb-4">Bu hesap yönetici değil. README&apos;deki “admin ekle” adımını uygula.</p>
        <button className={btnPrimary} onClick={() => supabase.auth.signOut()}>Çıkış</button>
      </div>
    );
  }

  const minDate = minEntryDate(today);
  const ctx = { supabase, token: session.access_token, date, setDate, toast, version, bump, goTo: setTab };
  const badge = inbox.unreadCount + inbox.newMotivations;

  return (
    <AdminContext.Provider value={ctx}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-page/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2 text-sm font-bold">
              <WolfLogo size={30} />
              Karargâh
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (badge > 0 ? setPopup(true) : setTab("karargah"))}
                className="relative grid size-9 place-items-center rounded-full border border-line bg-white/[0.03]"
                aria-label={`Bildirimler${badge ? `: ${badge} yeni` : ""}`}
              >
                <span aria-hidden>🔔</span>
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ff4d2e] px-1 text-[10px] font-black text-white shadow-[0_0_10px_rgba(255,77,46,0.8)]">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
              <Link href="/" className="text-xs font-semibold text-accent">Siteyi gör →</Link>
            </div>
          </div>
          {tab !== "karargah" && tab !== "ayarlar" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-30"
                disabled={date <= minDate}
                onClick={() => setDate(addDays(date, -1))}
                aria-label="Önceki gün"
              >
                ←
              </button>
              <label className="relative flex-1 cursor-pointer text-center text-sm font-semibold">
                {date === today ? "Bugün · " : ""}
                {formatDate(date, { day: "numeric", month: "long", weekday: "long" })}
                <span className="ml-1 text-xs text-muted">📅</span>
                <input
                  type="date"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={date}
                  min={minDate}
                  max={today}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  aria-label="Tarih seç (6 aya kadar geriye)"
                />
              </label>
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-30"
                disabled={date >= today}
                onClick={() => setDate(addDays(date, 1))}
                aria-label="Sonraki gün"
              >
                →
              </button>
              {date !== today && (
                <button type="button" className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs" onClick={() => setDate(today)}>
                  Bugün
                </button>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          {tab === "karargah" && <Karargah inbox={inbox} onInboxChange={poll} />}
          {tab === "ekle" && <AddFood />}
          {tab === "gun" && <DayLog />}
          {tab === "kilo" && <WeightTab />}
          {tab === "ayarlar" && <SettingsTab onSignOut={() => supabase.auth.signOut()} />}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${tab === t.key ? "text-accent" : "text-ink-2"}`}
                aria-current={tab === t.key ? "page" : undefined}
              >
                <span className="text-lg" aria-hidden>{t.icon}</span>
                {t.label}
                {t.key === "karargah" && badge > 0 && (
                  <span className="absolute right-[22%] top-1.5 size-2 rounded-full bg-[#ff4d2e] shadow-[0_0_8px_rgba(255,77,46,0.9)]" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {popup && (
          <MotivationPopup
            inbox={inbox}
            onClose={dismissPopup}
            onOpenNotes={() => {
              dismissPopup();
              setTab("karargah");
            }}
          />
        )}

        {toastMsg && (
          <div
            role="status"
            className={`fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toastMsg.kind === "err" ? "bg-[#c42f2f]" : "bg-[#1f2633]"}`}
          >
            {toastMsg.msg}
          </div>
        )}
      </div>
    </AdminContext.Provider>
  );
}

function Login() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Giriş başarısız: e-posta ya da şifre hatalı.");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <WolfLogo size={72} />
        <h1 className="text-xl font-bold">Kurt Giderek Azalıyor</h1>
        <p className="text-sm text-ink-2">Karargâha giriş</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className={inputCls} type="email" autoComplete="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" autoComplete="current-password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className={btnPrimary} disabled={loading}>{loading ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
    </div>
  );
}
