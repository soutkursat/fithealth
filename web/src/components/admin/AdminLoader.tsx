"use client";

import dynamic from "next/dynamic";

// The panel is login-gated and date-dependent, so it renders in the browser only.
export const AdminLoader = dynamic(() => import("./AdminApp").then((m) => m.AdminApp), {
  ssr: false,
  loading: () => <p className="p-10 text-center text-sm text-muted">Yükleniyor…</p>,
});
