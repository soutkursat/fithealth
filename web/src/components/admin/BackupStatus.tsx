"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/dates";

/** Vercel bu değişkenleri otomatik verir; yoksa varsayılan depo. */
const REPO =
  process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER && process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG
    ? `${process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER}/${process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG}`
    : "soutkursat/fithealth";

type State =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "ok"; at: string; days: number; count: number }
  | { kind: "error" };

/** Karargâh'ta haftalık yedeğin durumu. */
export function BackupStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(`https://api.github.com/repos/${REPO}/releases/tags/yedekler`, { headers: { Accept: "application/vnd.github+json" } })
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) return setState({ kind: "none" });
        if (!res.ok) return setState({ kind: "error" });
        const rel = (await res.json()) as { assets?: { name: string; created_at: string }[] };
        const assets = (rel.assets ?? []).filter((a) => a.name.startsWith("yedek-"));
        if (!assets.length) return setState({ kind: "none" });
        const latest = assets.map((a) => a.created_at).sort().at(-1)!;
        const days = Math.floor((Date.now() - new Date(latest).getTime()) / 86_400_000);
        setState({ kind: "ok", at: latest, days, count: assets.length });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  const link = `https://github.com/${REPO}/releases/tag/yedekler`;
  const actions = `https://github.com/${REPO}/actions/workflows/yedek.yml`;

  let icon = "⏳";
  let text: React.ReactNode = "Yedek durumu kontrol ediliyor…";
  let tone = "border-line";
  if (state.kind === "none") {
    icon = "⚠️";
    tone = "border-warn/40 bg-warn/[0.06]";
    text = (
      <>
        <b>Yedekleme henüz kurulmadı.</b> GitHub&apos;a üç Secret ekleyip{" "}
        <a href={actions} target="_blank" rel="noreferrer" className="text-accent underline">ilk yedeği başlat</a> (README → Yedekleme).
      </>
    );
  } else if (state.kind === "ok") {
    const stale = state.days > 8;
    icon = stale ? "⚠️" : "🛡️";
    tone = stale ? "border-warn/40 bg-warn/[0.06]" : "border-good/30 bg-good/[0.05]";
    text = (
      <>
        <b>Son yedek:</b> {formatDateTime(state.at)} ({state.days === 0 ? "bugün" : `${state.days} gün önce`}) · {state.count} yedek saklanıyor.{" "}
        {stale && <>Son haftanın yedeği eksik, <a href={actions} target="_blank" rel="noreferrer" className="text-accent underline">kontrol et</a>.</>}
        {!stale && <a href={link} target="_blank" rel="noreferrer" className="text-accent underline">Yedekler</a>}
      </>
    );
  } else if (state.kind === "error") {
    icon = "❔";
    text = "Yedek durumu şu an okunamadı (GitHub'a ulaşılamadı).";
  }

  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <span aria-hidden className="text-lg leading-none">{icon}</span>
      <p className="text-ink-2">{text}</p>
    </div>
  );
}
