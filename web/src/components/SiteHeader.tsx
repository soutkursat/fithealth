import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ active }: { active?: "bugun" | "gecmis" }) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active === key ? "bg-ink text-page" : "text-ink-2 hover:bg-surface-2"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/85 backdrop-blur supports-[backdrop-filter]:bg-page/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image src="/icon-192.png" alt="" width={36} height={36} className="rounded-lg" priority />
          <span className="text-[15px] font-semibold leading-tight tracking-tight sm:text-lg">Kurt Giderek Azalıyor</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1">
          {link("/", "Bugün", "bugun")}
          {link("/gecmis", "Geçmiş", "gecmis")}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-8 pt-10 text-xs text-muted">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <span>Besin değerleri Open Food Facts, USDA ve kendi kayıtlarımızdan gelir; yaklaşıktır.</span>
        <Link href="/admin" className="hover:text-ink-2">Panel</Link>
      </div>
    </footer>
  );
}
