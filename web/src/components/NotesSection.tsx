"use client";

import { useEffect, useState } from "react";
import type { Note } from "@/lib/types";

const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

function ago(ts: string, now: number): string {
  const s = Math.round((new Date(ts).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return "az önce";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(ts));
}

const NAME_KEY = "kurt-not-isim";

export function NotesSection({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setNow(Date.now());
      try {
        const saved = localStorage.getItem(NAME_KEY);
        if (saved) setName(saved);
      } catch {
        /* depolama kapalı olabilir */
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, website }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Not gönderilemedi.");
      if (d.note) setNotes((n) => [d.note as Note, ...n].slice(0, 12));
      setMessage("");
      setStatus({ kind: "ok", text: "Notun Kurt'a ulaştı! 🐺 Ulumayla cevap verebilir." });
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* önemli değil */
      }
    } catch (err) {
      setStatus({ kind: "err", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-labelledby="notlar">
      <form onSubmit={send} className="glass reveal flex flex-col gap-3 p-5 sm:p-6">
        <div>
          <h2 id="notlar" className="text-xl font-bold tracking-tight">✍️ Kurt&apos;a bir not gönder</h2>
          <p className="mt-0.5 text-sm text-ink-2">Üyelik yok, şifre yok. Adını yaz, gazını ver.</p>
        </div>
        <input className={input} placeholder="Adın (ör. Ayşe Teyze)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        <div className="relative">
          <textarea
            className={`${input} min-h-24 resize-y`}
            placeholder="Kurt'a ne demek istersin? Övgü, gaz, ufak bir laf sokma…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            required
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted">{message.length}/500</span>
        </div>
        {/* Botlar için gizli alan */}
        <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />
        <button
          disabled={sending || !name.trim() || !message.trim()}
          className="rounded-xl bg-accent px-4 py-3 font-bold text-[#06080d] shadow-[0_0_24px_-6px_var(--glow)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {sending ? "Gönderiliyor…" : "Notu gönder 🐺"}
        </button>
        {status && (
          <p role="status" className={`text-sm ${status.kind === "ok" ? "text-good" : "text-bad"}`}>{status.text}</p>
        )}
      </form>

      <div className="glass reveal flex min-h-48 flex-col p-5 sm:p-6" style={{ ["--d" as string]: "80ms" }}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Gelen notlar</h3>
        {notes.length === 0 ? (
          <p className="m-auto text-center text-sm text-muted">Henüz kimse yazmadı. İlk gazı sen ver!</p>
        ) : (
          <ul className="-mr-2 flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-white/[0.025] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold">{n.name}</span>
                  {now != null && <span className="shrink-0 text-[11px] text-muted">{ago(n.created_at, now)}</span>}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-2">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
