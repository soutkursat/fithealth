#!/usr/bin/env node
/**
 * Supabase'deki önemli tabloları tek bir JSON dosyasına yedekler.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node yedekle.mjs > yedek.json
 *
 * Gizli bilgi (ziyaretçi IP izi) yedeğe alınmaz.
 */

// Geri yüklerken bu sırayla eklenir (yabancı anahtarlar için).
const TABLES = [
  "settings",
  "products",
  "food_logs",
  "daily_activity",
  "weights",
  "water_logs",
  "manual_burns",
  "manual_day_totals",
  "notes",
  "motivations",
];

const DROP = { notes: ["ip_hash"], motivations: ["ip_hash"] };
// Birincil anahtarı log_date olan tablolar
const ORDER_BY = { daily_activity: "log_date", weights: "log_date", manual_day_totals: "log_date" };
const PAGE = 1000;

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=${ORDER_BY[table] ?? "id"}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" },
    });
    if (!res.ok) {
      const body = await res.text();
      // Tablo henüz oluşturulmamışsa (schema.sql eski) yedeği iptal etme, atla.
      if (res.status === 404 || /PGRST205|42P01/.test(body)) {
        console.error(`::warning::${table} tablosu veritabanında yok, atlandı. supabase/schema.sql dosyasını Supabase'de tekrar çalıştır.`);
        return null;
      }
      throw new Error(`${table}: HTTP ${res.status} ${body}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const drop = DROP[table] ?? [];
  return drop.length ? rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k)))) : rows;
}

const backup = { app: "kurt-giderek-azaliyor", version: 1, created_at: new Date().toISOString(), tables: {} };
const skipped = [];
for (const t of TABLES) {
  const rows = await fetchAll(t);
  if (rows === null) {
    skipped.push(t);
    continue;
  }
  backup.tables[t] = rows;
  console.error(`${t}: ${rows.length} satır`);
}
if (skipped.length) backup.skipped = skipped;
process.stdout.write(JSON.stringify(backup));
