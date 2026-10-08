"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { getBrowserClient, isConfigured } from "@/lib/supabase";
import { addDays, formatDate, isoDate } from "@/lib/dates";
import { AdminContext, btnPrimary, inputCls } from "./context";
import { AddFood } from "./AddFood";
import { DayLog } from "./DayLog";
import { WeightTab } from "./WeightTab";
import { SettingsTab } from "./SettingsTab";

type Tab = "ekle" | "gun" | "kilo" | "ayarlar";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "ekle", label: "Ekle", icon: "➕" },
  { key: "gun", label: "Gün", icon: "📋" },
  { key: "kilo", label: "Kilo", icon: "⚖️" },
  { key: "ayarlar", label: "Ayarlar", icon: "⚙️" },
];

export function AdminApp() {
  if (!isConfigured) {
    return <p className="p-6 text-center text-sm text-muted">Supabase ortam değişkenleri eksik. README&apos;ye bak.</p>;
  }
  return <AdminInner />;
}

function AdminInner() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("ekle");
  const [date, setDate] = useState(() => isoDate());
  const [version, setVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

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

  if (session === undefined) return <p className="p-10 text-center text-sm text-muted">Yükleniyor…</p>;
  if (!session) return <Login onLogin={() => undefined} />;
  if (isAdmin === null) return <p className="p-10 text-center text-sm text-muted">Yetki kontrol ediliyor…</p>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm p-6 text-center text-sm">
        <p className="mb-4">Bu hesap yönetici değil. README&apos;deki “admin ekle” adımını uygula.</p>
        <button className={btnPrimary} onClick={() => supabase.auth.signOut()}>Çıkış</button>
      </div>
    );
  }

  const today = isoDate();
  const ctx = { supabase, token: session.access_token, date, setDate, toast, version, bump };

  return (
    <AdminContext.Provider value={ctx}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-page/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
              <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
              Kurt Giderek Azalıyor
            </Link>
            <Link href="/" className="text-xs text-accent">Siteyi gör →</Link>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg border border-line px-3 py-1.5" onClick={() => setDate(addDays(date, -1))} aria-label="Önceki gün">←</button>
            <div className="flex-1 text-center text-sm font-medium">
              {date === today ? "Bugün · " : ""}
              {formatDate(date, { day: "numeric", month: "long", weekday: "short" })}
            </div>
            <button type="button" className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-30" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} aria-label="Sonraki gün">→</button>
            {date !== today && <button type="button" className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs" onClick={() => setDate(today)}>Bugün</button>}
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          {tab === "ekle" && <AddFood />}
          {tab === "gun" && <DayLog />}
          {tab === "kilo" && <WeightTab />}
          {tab === "ayarlar" && <SettingsTab onSignOut={() => supabase.auth.signOut()} />}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${tab === t.key ? "text-accent" : "text-ink-2"}`}
                aria-current={tab === t.key ? "page" : undefined}
              >
                <span className="text-lg" aria-hidden>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {toastMsg && (
          <div
            role="status"
            className={`fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toastMsg.kind === "err" ? "bg-[#c42f2f]" : "bg-[#1f1f1d]"}`}
          >
            {toastMsg.msg}
          </div>
        )}
      </div>
    </AdminContext.Provider>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
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
    if (error) setError("Giriş başarısız: e-posta veya şifre hatalı.");
    else onLogin();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/icon-192.png" alt="" width={72} height={72} className="rounded-2xl" priority />
        <h1 className="text-xl font-semibold">Kurt Giderek Azalıyor</h1>
        <p className="text-sm text-ink-2">Yönetici girişi</p>
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
