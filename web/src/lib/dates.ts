export const TZ = "Europe/Istanbul";

/** YYYY-MM-DD in Istanbul time. */
export function isoDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", weekday: "long" }): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", ...opts }).format(new Date(`${iso}T12:00:00Z`));
}

/** "8 Ekim" */
export function shortDate(iso: string): string {
  return formatDate(iso, { day: "numeric", month: "long" });
}

/** "Bugün", "Dün" ya da "8 Ekim Salı" */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Bugün";
  if (iso === addDays(today, -1)) return "Dün";
  return formatDate(iso, { day: "numeric", month: "long", weekday: "long" });
}

export function formatTime(ts: string): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}

export function formatDateTime(ts: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

/** Current hour in Istanbul, used to guess the meal. */
export function istanbulHour(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
}

/** Türkçe bulunma eki: "Ağustos" → "Ağustos'ta", "Ekim" → "Ekim'de". */
export function withLocative(word: string): string {
  const lower = word.toLocaleLowerCase("tr-TR");
  const vowels = lower.match(/[aıoueiöü]/g);
  const back = vowels ? "aıou".includes(vowels[vowels.length - 1]) : true;
  const hard = "fstkçşhp".includes(lower.at(-1) ?? "");
  return `${word}'${hard ? "t" : "d"}${back ? "a" : "e"}`;
}
