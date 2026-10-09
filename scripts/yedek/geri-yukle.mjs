#!/usr/bin/env node
/**
 * Çözülmüş bir yedeği (yedek.json) Supabase SQL Editor'a yapıştırılacak
 * SQL'e çevirir. Var olan satırlara dokunmaz (on conflict do nothing),
 * sadece eksikleri geri ekler.
 *
 *   node geri-yukle.mjs yedek.json > geri-yukle.sql
 */
import { readFileSync } from "node:fs";

const ORDER = ["settings", "products", "food_logs", "daily_activity", "weights", "water_logs", "manual_burns", "manual_day_totals", "notes", "motivations"];
// "generated always as identity" kolonları olan tablolar
const IDENTITY = new Set(["products", "food_logs", "water_logs", "manual_burns", "notes", "motivations"]);

const file = process.argv[2];
if (!file) {
  console.error("Kullanım: node geri-yukle.mjs yedek.json > geri-yukle.sql");
  process.exit(1);
}
const backup = JSON.parse(readFileSync(file, "utf8"));
if (backup.app !== "kurt-giderek-azaliyor") {
  console.error("Bu dosya bir Kurt Giderek Azalıyor yedeği değil.");
  process.exit(1);
}

const lit = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `array[${v.map(lit).join(", ")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const ident = (s) => `"${s.replace(/"/g, '""')}"`;

const out = [
  `-- Kurt Giderek Azalıyor yedeği: ${backup.created_at}`,
  "-- Supabase SQL Editor'a yapıştırıp çalıştır. Önce supabase/schema.sql çalışmış olmalı.",
  "begin;",
];
for (const table of ORDER) {
  const rows = backup.tables?.[table] ?? [];
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  out.push(`\n-- ${table}: ${rows.length} satır`);
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    out.push(
      `insert into public.${ident(table)} (${cols.map(ident).join(", ")})${IDENTITY.has(table) ? " overriding system value" : ""} values\n` +
        chunk.map((r) => `  (${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n") +
        "\non conflict do nothing;",
    );
  }
  if (IDENTITY.has(table)) {
    out.push(
      `select setval(pg_get_serial_sequence('public.${table}', 'id'), greatest((select coalesce(max(id), 0) from public.${ident(table)}), 1));`,
    );
  }
}
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
