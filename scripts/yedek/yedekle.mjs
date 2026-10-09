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
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const drop = DROP[table] ?? [];
  return drop.length ? rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k)))) : rows;
}

const backup = { app: "kurt-giderek-azaliyor", version: 1, created_at: new Date().toISOString(), tables: {} };
for (const t of TABLES) {
  backup.tables[t] = await fetchAll(t);
  console.error(`${t}: ${backup.tables[t].length} satır`);
}
process.stdout.write(JSON.stringify(backup));
