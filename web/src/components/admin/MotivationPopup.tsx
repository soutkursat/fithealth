"use client";

import { AngryWolf } from "@/components/AngryWolf";

export type Inbox = {
  unreadNotes: { id: number; name: string; message: string; created_at: string }[];
  unreadCount: number;
  newMotivations: number;
};

export function MotivationPopup({ inbox, onClose, onOpenNotes }: { inbox: Inbox; onClose: () => void; onOpenNotes: () => void }) {
  const n = inbox.newMotivations;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Yeni bildirimler"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-line-strong p-6 text-center ${n > 0 ? "ember" : ""}`}
        style={{
          background:
            n > 0
              ? "radial-gradient(circle at 50% 0%, rgba(255,60,30,0.35), transparent 60%), #120c0e"
              : "radial-gradient(circle at 50% 0%, rgba(90,169,255,0.25), transparent 60%), #0f131b",
        }}
      >
        {n > 0 ? (
          <>
            <AngryWolf className="wolf-enter mx-auto h-40 w-auto" />
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              <span className="text-[#ff8a5c]">{n}</span> kez motive edildin!
            </h2>
            <p className="mt-1 text-sm text-ink-2">Millet arkanda, Bozkurt. Kalk koş, Kızılelma bekliyor! 🔥</p>
          </>
        ) : (
          <>
            <div className="text-5xl" aria-hidden>📜</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Yeni notların var</h2>
          </>
        )}

        {inbox.unreadNotes.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 text-left">
            {inbox.unreadNotes.slice(0, 3).map((note) => (
              <li key={note.id} className="rounded-xl border border-line bg-white/[0.04] px-3 py-2">
                <div className="text-xs font-bold text-accent">{note.name}</div>
                <p className="line-clamp-2 text-sm text-ink-2">{note.message}</p>
              </li>
            ))}
            {inbox.unreadCount > 3 && <li className="text-center text-xs text-muted">+{inbox.unreadCount - 3} not daha</li>}
          </ul>
        )}

        <div className="mt-5 grid gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-gradient-to-r from-[#ff4d2e] to-[#ffab2e] px-4 py-3 font-black text-[#1a0603]">
            Gazı aldım! 🐺
          </button>
          {inbox.unreadCount > 0 && (
            <button type="button" onClick={onOpenNotes} className="rounded-xl border border-line px-4 py-3 font-semibold">
              Notları oku ({inbox.unreadCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
