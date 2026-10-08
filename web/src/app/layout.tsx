import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kurt Giderek Azalıyor", template: "%s · Kurt Giderek Azalıyor" },
  description: "Günlük kalori, yenilenler, yakılanlar ve kilo takibi.",
  applicationName: "Kurt Giderek Azalıyor",
  appleWebApp: { capable: true, title: "Kurt Azalıyor", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06080d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
