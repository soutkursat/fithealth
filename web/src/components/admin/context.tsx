"use client";

import { createContext, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal } from "@/lib/types";
import { istanbulHour } from "@/lib/dates";

export type AdminCtx = {
  supabase: SupabaseClient;
  token: string;
  date: string;
  setDate: (d: string) => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
  /** Bumped after any write, so lists refetch. */
  version: number;
  bump: () => void;
};

export const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("AdminContext yok");
  return ctx;
}

export function guessMeal(): Meal {
  const h = istanbulHour();
  if (h >= 5 && h < 11) return "kahvalti";
  if (h >= 11 && h < 16) return "ogle";
  if (h >= 17 && h < 22) return "aksam";
  return "ara";
}

export async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
export const btnPrimary =
  "rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50 active:scale-[0.98] transition";
export const btnGhost = "rounded-xl border border-line px-4 py-3 font-medium hover:bg-surface-2 active:scale-[0.98] transition";
