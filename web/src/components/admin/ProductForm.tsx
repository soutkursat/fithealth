"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { btnGhost, btnPrimary, inputCls, useAdmin } from "./context";
import { Sheet } from "./PortionSheet";

type Fields = {
  name: string;
  brand: string;
  barcode: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  fiber: string;
  salt: string;
  serving: string;
};

const str = (v: number | null | undefined) => (v == null ? "" : String(v));
const parse = (s: string) => {
  const v = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

/** Creates (or edits) a product with per-100g values, e.g. from the package label. */
export function ProductForm({
  initial,
  notice,
  onSaved,
  onCancel,
}: {
  initial?: Partial<Product>;
  notice?: string;
  onSaved: (p: Product) => void;
  onCancel: () => void;
}) {
  const { supabase, toast } = useAdmin();
  const [f, setF] = useState<Fields>({
    name: initial?.name ?? "",
    brand: initial?.brand ?? "",
    barcode: initial?.barcode ?? "",
    kcal: str(initial?.kcal_100g),
    protein: str(initial?.protein_100g),
    carbs: str(initial?.carbs_100g),
    fat: str(initial?.fat_100g),
    sugar: str(initial?.sugar_100g),
    fiber: str(initial?.fiber_100g),
    salt: str(initial?.salt_100g),
    serving: str(initial?.serving_g),
  });
  const [basis, setBasis] = useState<"100" | "serving">("100");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const serving = parse(f.serving);
  const factor = basis === "serving" ? (serving && serving > 0 ? 100 / serving : null) : 1;
  const per100 = (s: string) => {
    const v = parse(s);
    return v == null || factor == null ? null : Math.round(v * factor * 10) / 10;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const kcal_100g = per100(f.kcal);
    if (!f.name.trim() || kcal_100g == null) return toast("İsim ve kalori zorunlu", "err");
    if (basis === "serving" && !serving) return toast("Porsiyon gramajını gir", "err");
    setSaving(true);
    const row = {
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      barcode: f.barcode.replace(/\D/g, "") || null,
      kcal_100g,
      protein_100g: per100(f.protein),
      carbs_100g: per100(f.carbs),
      fat_100g: per100(f.fat),
      sugar_100g: per100(f.sugar),
      fiber_100g: per100(f.fiber),
      salt_100g: per100(f.salt),
      serving_g: serving,
      image_url: initial?.image_url ?? null,
      source: "manual",
    };
    const query = initial?.id
      ? supabase.from("products").update(row).eq("id", initial.id)
      : row.barcode
        ? supabase.from("products").upsert(row, { onConflict: "barcode" })
        : supabase.from("products").insert(row);
    const { data, error } = await query.select("*").single();
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast("Ürün kaydedildi");
    onSaved({ ...(data as Product), kcal_100g: Number(data.kcal_100g) });
  }

  return (
    <Sheet onClose={onCancel}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{initial?.id ? "Ürünü düzenle" : "Yeni ürün"}</h3>
        {notice && <p className="rounded-xl bg-accent-soft/60 p-3 text-sm">{notice}</p>}
        <Field label="Ürün adı *"><input className={inputCls} value={f.name} onChange={set("name")} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marka"><input className={inputCls} value={f.brand} onChange={set("brand")} /></Field>
          <Field label="Barkod"><input className={inputCls} value={f.barcode} onChange={set("barcode")} inputMode="numeric" /></Field>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm">
          {(["100", "serving"] as const).map((b) => (
            <button key={b} type="button" onClick={() => setBasis(b)} className={`rounded-lg py-2 font-medium ${basis === b ? "bg-surface shadow-sm" : "text-ink-2"}`}>
              {b === "100" ? "Etiket: 100 g başına" : "Etiket: porsiyon başına"}
            </button>
          ))}
        </div>
        <Field label={basis === "serving" ? "Porsiyon (g) *" : "Porsiyon (g) — isteğe bağlı"}>
          <input className={inputCls} value={f.serving} onChange={set("serving")} inputMode="decimal" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Enerji (kcal) *"><input className={inputCls} value={f.kcal} onChange={set("kcal")} inputMode="decimal" required /></Field>
          <Field label="Protein (g)"><input className={inputCls} value={f.protein} onChange={set("protein")} inputMode="decimal" /></Field>
          <Field label="Karbonhidrat (g)"><input className={inputCls} value={f.carbs} onChange={set("carbs")} inputMode="decimal" /></Field>
          <Field label="Yağ (g)"><input className={inputCls} value={f.fat} onChange={set("fat")} inputMode="decimal" /></Field>
          <Field label="Şeker (g)"><input className={inputCls} value={f.sugar} onChange={set("sugar")} inputMode="decimal" /></Field>
          <Field label="Lif (g)"><input className={inputCls} value={f.fiber} onChange={set("fiber")} inputMode="decimal" /></Field>
          <Field label="Tuz (g)"><input className={inputCls} value={f.salt} onChange={set("salt")} inputMode="decimal" /></Field>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={btnGhost} onClick={onCancel}>Vazgeç</button>
          <button className={`${btnPrimary} flex-1`} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet ve devam et"}</button>
        </div>
      </form>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
