import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WolfMark } from "@/components/Wolf";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <WolfMark className="h-20 w-auto opacity-80" glow />
          <h1 className="text-xl font-bold">Burası bozkırın dışı</h1>
          <p className="text-sm text-ink-2">Aradığın sayfa yok. Kurt da bulamadı.</p>
          <Link href="/" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-white/5">
            Ana sayfaya dön →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
