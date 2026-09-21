import type { Metadata } from "next";
import { AdminChrome } from "@/components/admin/AdminChrome";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · GNL Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <AdminChrome />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
