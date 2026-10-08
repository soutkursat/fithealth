import type { Metadata } from "next";
import { AdminLoader } from "@/components/admin/AdminLoader";

export const metadata: Metadata = { title: "Panel", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminLoader />;
}
