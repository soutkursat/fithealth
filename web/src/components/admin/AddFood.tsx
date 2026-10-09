"use client";

import { useEffect, useRef, useState } from "react";
import { SOURCE_LABELS, type Meal, type Product } from "@/lib/types";
import { kcal } from "@/lib/format";
import { BarcodeScanner } from "./BarcodeScanner";
import { PortionSheet, MealPicker, Sheet } from "./PortionSheet";
import { ProductForm } from "./ProductForm";
import { WaterQuick } from "./WaterQuick";
import { api, btnGhost, btnPrimary, guessMeal, inputCls, useAdmin } from "./context";

type BarcodeResponse = { status: "found" | "partial" | "not_found"; product: Product | null };
type SearchResponse = { local: Product[]; external: Product[] };
type Recent = { product: Product; grams: number | null };

type Modal =
  | { kind: "scan" }
  | { kind: "portion"; product: Product; grams?: number }
  | { kind: "form"; initial?: Partial<Product>; notice?: string }
  | { kind: "quick" }
  | null;

const toProduct = (r: Record<string, unknown>): Product => ({
  ...(r as unknown as Product),
  kcal_100g: r.kcal_100g == null ? null : Number(r.kcal_100g),
  protein_100g: r.protein_100g == null ? null : Number(r.protein_100g),
  carbs_100g: r.carbs_100g == null ? null : Number(r.carbs_100g),
  fat_100g: r.fat_100g == null ? null : Number(r.fat_100g),
  serving_g: r.serving_g == null ? null : Number(r.serving_g),
});

export function AddFood() {
  const { supabase, token, toast, version } = useAdmin();
  const [meal, setMeal] = useState<Meal>(guessMeal);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<Product[]>([]);
  const [external, setExternal] = useState<Product[]>([]);
  const [searchingExt, setSearchingExt] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const reqId = useRef(0);

  // Son yenenler: tek dokunuşla tekrar ekleme
  useEffect(() => {
    let alive = true;
    supabase
      .from("food_logs")
      .select("name, brand, grams, kcal, protein, carbs, fat, image_url, product_id")
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data }) => {
        if (!alive || !data) return;
        const seen = new Set<string>();
        const out: Recent[] = [];
        for (const r of data) {
          const key = `${r.name}|${r.brand ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const g = r.grams == null ? null : Number(r.grams);
          const per = (v: unknown) => (v == null ? null : g ? Math.round((Number(v) / g) * 1000) / 10 : null);
          out.push({
            grams: g,
            product: {
              id: r.product_id ?? undefined,
              name: r.name,
              brand: r.brand,
              // Gramajsız (hızlı) kayıtlar için "100 g" = 1 porsiyon kabul edilir.
              kcal_100g: g ? per(r.kcal) : Number(r.kcal),
              protein_100g: g ? per(r.protein) : r.protein,
              carbs_100g: g ? per(r.carbs) : r.carbs,
              fat_100g: g ? per(r.fat) : r.fat,
              image_url: r.image_url,
              source: "local",
            },
          });
          if (out.length >= 12) break;
        }
        setRecent(out);
      });
    return () => {
      alive = false;
    };
  }, [supabase, version]);

  // Arama: önce yerel (hızlı), sonra Open Food Facts + USDA
  useEffect(() => {
    const term = q.trim();
    const id = ++reqId.current;
    if (term.length < 2) return; // results are hidden below 2 chars
    const t = setTimeout(async () => {
      try {
        const loc = await api<SearchResponse>(`/api/foods/search?external=0&q=${encodeURIComponent(term)}`, token);
        if (id !== reqId.current) return;
        setLocal(loc.local.map(toProduct));
        setSearchingExt(true);
        const all = await api<SearchResponse>(`/api/foods/search?q=${encodeURIComponent(term)}`, token);
        if (id !== reqId.current) return;
        setExternal(all.external);
      } catch (e) {
        if (id === reqId.current) toast(`Arama hatası: ${(e as Error).message}`, "err");
      } finally {
        if (id === reqId.current) setSearchingExt(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, token, toast]);

  async function onBarcode(code: string) {
    setModal(null);
    setBusy(`${code} aranıyor…`);
    try {
      const res = await api<BarcodeResponse>(`/api/barcode/${code}`, token);
      if (res.status === "found" && res.product) {
        setModal({ kind: "portion", product: toProduct(res.product as unknown as Record<string, unknown>) });
      } else if (res.status === "partial" && res.product) {
        setModal({
          kind: "form",
          initial: { ...res.product, barcode: code },
          notice: "Ürün bulundu ama besin değerleri yok. Etiketten bir kez gir, sonraki okutmada otomatik gelir.",
        });
      } else {
        setModal({
          kind: "form",
          initial: { barcode: code },
          notice: "Bu barkod hiçbir veritabanında yok. Etiketteki değerleri bir kez gir, kaydedelim.",
        });
      }
    } catch (e) {
      toast(`Barkod aranamadı: ${(e as Error).message}`, "err");
    } finally {
      setBusy(null);
    }
  }

  const list = (items: Product[]) => (
    <ul className="card divide-y divide-[var(--border)] overflow-hidden">
      {items.map((p, i) => (
        <li key={`${p.source}-${p.id ?? p.barcode ?? p.name}-${i}`}>
          <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2" onClick={() => setModal({ kind: "portion", product: p })}>
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-lg bg-surface-2 object-contain" loading="lazy" />
            ) : (
              <div className="size-10 shrink-0 rounded-lg bg-surface-2" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="truncate text-xs text-muted">{[p.brand, SOURCE_LABELS[p.source] ?? p.source].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="shrink-0 text-right text-sm">
              <b>{kcal(p.kcal_100g)}</b>
              <div className="text-[11px] text-muted">kcal/100g</div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      <WaterQuick />
      <MealPicker value={meal} onChange={setMeal} />

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={`${btnPrimary} py-5 text-base`} onClick={() => setModal({ kind: "scan" })}>
          📷 Barkod okut
        </button>
        <div className="grid grid-rows-2 gap-2">
          <button type="button" className={`${btnGhost} py-2 text-sm`} onClick={() => setModal({ kind: "form" })}>➕ Yeni ürün</button>
          <button type="button" className={`${btnGhost} py-2 text-sm`} onClick={() => setModal({ kind: "quick" })}>⚡ Hızlı kalori</button>
        </div>
      </div>

      <input className={inputCls} placeholder="Ara: simit, yoğurt, ülker…" value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" />

      {q.trim().length >= 2 ? (
        <div className="flex flex-col gap-3">
          {local.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-ink-2">Kayıtlı ürünler ve temel besinler</h3>
              {list(local)}
            </section>
          )}
          <section>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Open Food Facts · USDA {searchingExt && <span className="text-muted">— aranıyor…</span>}</h3>
            {external.length > 0 ? list(external) : !searchingExt && <p className="text-sm text-muted">Sonuç yok. “Yeni ürün” ile ekleyebilirsin.</p>}
          </section>
        </div>
      ) : (
        recent.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Son yediklerin</h3>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={`${r.product.name}|${r.product.brand ?? ""}`}
                  type="button"
                  className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
                  onClick={() => setModal({ kind: "portion", product: r.product, grams: r.grams ?? 100 })}
                >
                  {r.product.name}
                  {r.grams != null && <span className="text-muted"> · {r.grams} g</span>}
                </button>
              ))}
            </div>
          </section>
        )
      )}

      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="card px-6 py-4 font-medium">{busy}</div>
        </div>
      )}

      {modal?.kind === "scan" && <BarcodeScanner onDetected={onBarcode} onClose={() => setModal(null)} />}
      {modal?.kind === "portion" && (
        <PortionSheet
          product={modal.product}
          meal={meal}
          initialGrams={modal.grams}
          onDone={() => {
            setModal(null);
            setQ("");
          }}
          onCancel={() => setModal(null)}
          onEdit={modal.product.id && modal.product.source !== "local" ? () => setModal({ kind: "form", initial: modal.product }) : undefined}
        />
      )}
      {modal?.kind === "form" && (
        <ProductForm
          initial={modal.initial}
          notice={modal.notice}
          onSaved={(p) => setModal({ kind: "portion", product: p })}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "quick" && <QuickAdd meal={meal} onClose={() => setModal(null)} />}
    </div>
  );
}

/** Restoran yemeği vb.: sadece isim + toplam kalori. */
function QuickAdd({ meal: initialMeal, onClose }: { meal: Meal; onClose: () => void }) {
  const { supabase, date, toast, bump } = useAdmin();
  const [meal, setMeal] = useState(initialMeal);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [saving, setSaving] = useState(false);
  const num = (s: string) => {
    const v = Number.parseFloat(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const k = num(cal);
    if (!name.trim() || k == null) return toast("İsim ve kalori zorunlu", "err");
    setSaving(true);
    const { error } = await supabase.from("food_logs").insert({
      log_date: date,
      meal,
      name: name.trim(),
      kcal: k,
      protein: num(p),
      carbs: num(c),
      fat: num(f),
    });
    setSaving(false);
    if (error) return toast(`Kaydedilemedi: ${error.message}`, "err");
    toast(`${name.trim()} eklendi · ${kcal(k)} kcal`);
    bump();
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Hızlı kalori ekle</h3>
        <input className={inputCls} placeholder="Ne yedin? (ör. Dışarıda hamburger menü)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={`${inputCls} text-lg`} placeholder="Toplam kalori (kcal)" inputMode="decimal" value={cal} onChange={(e) => setCal(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <input className={inputCls} placeholder="Protein g" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
          <input className={inputCls} placeholder="Karb. g" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} />
          <input className={inputCls} placeholder="Yağ g" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} />
        </div>
        <MealPicker value={meal} onChange={setMeal} />
        <div className="mt-2 flex gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Vazgeç</button>
          <button className={`${btnPrimary} flex-1`} disabled={saving}>{saving ? "Ekleniyor…" : "Ekle"}</button>
        </div>
      </form>
    </Sheet>
  );
}
