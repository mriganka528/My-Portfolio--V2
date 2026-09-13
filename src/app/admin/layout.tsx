import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin | Portfolio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-surface">{children}</div>;
}
