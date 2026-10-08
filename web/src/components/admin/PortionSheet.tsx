"use client";

import { useState } from "react";
import { MEALS, SOURCE_LABELS, type Meal, type Product } from "@/lib/types";
import { kcal, num1, scale } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls, useAdmin } from "./context";

/** Ensures an external product is cached in our DB (when it has a barcode) and returns its id. */
async function ensureProductId(supabase: ReturnType<typeof useAdmin>["supabase"], p: Product): Promise<number | null> {
  if (p.id) return p.id;
  if (!p.barcode || p.kcal_100g == null) return null;
  const { data } = await supabase
    .from("products")
    .upsert(
      {
        barcode: p.barcode,
        name: p.name,
        brand: p.brand ?? null,
        kcal_100g: p.kcal_100g,
        protein_100g: p.protein_100g ?? null,
        carbs_100g: p.carbs_100g ?? null,
        fat_100g: p.fat_100g ?? null,
        sugar_100g: p.sugar_100g ?? null,
        fiber_100g: p.fiber_100g ?? null,
        salt_100g: p.salt_100g ?? null,
        serving_g: p.serving_g ?? null,
        image_url: p.image_url ?? null,
        source: p.source,
      },
      { onConflict: "barcode" },
    )
    .select("id")
    .single();
  return data?.id ?? null;
}

export function PortionSheet({
  product,
  meal: initialMeal,
  initialGrams,
  onDone,
  onCancel,
  onEdit,
}: {
  product: Product;
  meal: Meal;
  initialGrams?: number;
  onDone: () => void;
  onCancel: () => void;
  onEdit?: () => void;
}) {
  const { supabase, date, toast, bump } = useAdmin();
  const [grams, setGrams] = useState(String(initialGrams ?? product.serving_g ?? 100));
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [saving, setSaving] = useState(false);

  const g = Number.parseFloat(grams.replace(",", ".")) || 0;
  const k = scale(product.kcal_100g, g);
  const presets = [product.serving_g, 50, 100, 150, 200, 250].filter(
    (v, i, a): v is number => v != null && v > 0 && a.indexOf(v) === i,
  );

  async function save() {
    if (k == null || g <= 0) return;
    setSaving(true);
    const product_id = await ensureProductId(supabase, product);
    const { error } = await supabase.from("food_logs").insert({
      log_date: date,
      meal,
      product_id,
      name: product.name,
      brand: product.brand ?? null,
      grams: g,
      kcal: k,
      protein: scale(product.protein_100g, g),
      carbs: scale(product.carbs_100g, g),
      fat: scale(product.fat_100g, g),
      image_url: product.image_url ?? null,
    });
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast(`${product.name} eklendi · ${kcal(k)} kcal`);
    bump();
    onDone();
  }

  return (
    <Sheet onClose={onCancel}>
      <div className="flex gap-3">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="size-16 shrink-0 rounded-xl bg-surface-2 object-contain" />
        ) : null}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
          <p className="text-sm text-ink-2">{[product.brand, SOURCE_LABELS[product.source] ?? product.source].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-xs text-muted">
            100 g: {kcal(product.kcal_100g)} kcal · P {num1(product.protein_100g)} · K {num1(product.carbs_100g)} · Y {num1(product.fat_100g)}
          </p>
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium">Miktar (gram / ml)</label>
      <input className={`${inputCls} mt-1 text-lg`} inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} autoFocus />
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((v) => (
          <button key={v} type="button" onClick={() => setGrams(String(v))} className={`rounded-full border px-3 py-1 text-sm ${g === v ? "border-accent bg-accent font-semibold text-[#06080d]" : "border-line"}`}>
            {v === product.serving_g ? `1 porsiyon (${v} g)` : `${v} g`}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-surface-2 p-3 text-center">
        <Macro label="Kalori" value={kcal(k)} strong />
        <Macro label="Protein" value={`${num1(scale(product.protein_100g, g))} g`} />
        <Macro label="Karb." value={`${num1(scale(product.carbs_100g, g))} g`} />
        <Macro label="Yağ" value={`${num1(scale(product.fat_100g, g))} g`} />
      </div>

      <MealPicker value={meal} onChange={setMeal} />

      <div className="mt-5 flex gap-2">
        {onEdit && <button type="button" className={btnGhost} onClick={onEdit}>Düzenle</button>}
        <button type="button" className={`${btnPrimary} flex-1`} disabled={saving || k == null || g <= 0} onClick={save}>
          {saving ? "Ekleniyor…" : "Günlüğe ekle"}
        </button>
      </div>
    </Sheet>
  );
}

function Macro({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className={strong ? "text-lg font-semibold" : "font-medium"}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
      {MEALS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={`rounded-lg px-1 py-2 text-xs font-medium sm:text-sm ${value === m.key ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
        >
          <span aria-hidden>{m.emoji}</span> {m.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
        style={{ background: "var(--surface)", backdropFilter: "none" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
