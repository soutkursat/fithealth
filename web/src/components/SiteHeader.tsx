import Link from "next/link";
import { WolfLogo } from "./Wolf";

export function SiteHeader({ active }: { active?: "bugun" | "gecmis" }) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
        active === key
          ? "bg-white/10 text-ink shadow-[0_0_20px_-6px_var(--glow)] ring-1 ring-white/15"
          : "text-ink-2 hover:bg-white/5 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <WolfLogo size={38} />
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-bold tracking-tight sm:text-lg">Kurt Giderek Azalıyor</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-muted sm:block">kilo yolculuğu</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-white/[0.02] p-1">
          {link("/", "Bugün", "bugun")}
          {link("/gecmis", "Geçmiş", "gecmis")}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-10 pt-12 text-xs text-muted">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <span className="flex items-center gap-2">
          <span aria-hidden>🐺</span>
          <span><b className="text-ink-2">Ne mutlu zayıflayana!</b> Besin değerleri Open Food Facts, USDA ve kendi kayıtlarımızdan gelir; yaklaşıktır.</span>
        </span>
        <Link href="/admin" className="rounded-full px-2 py-1 hover:text-ink-2">Panel</Link>
      </div>
    </footer>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
