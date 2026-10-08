export function SetupNotice() {
  return (
    <div className="card mx-auto my-10 max-w-xl p-6 text-sm leading-relaxed">
      <h2 className="mb-2 text-lg font-semibold">Kurulum tamamlanmadı</h2>
      <p className="text-ink-2">
        <code>NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ortam değişkenleri
        tanımlı değil. Depodaki <code>README.md</code> dosyasındaki adımları izle.
      </p>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Yükleniyor">
      <div className="card h-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-72" />
    </div>
  );
}
