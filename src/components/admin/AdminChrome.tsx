"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AdminChrome() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/admin/login") return null;

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-line bg-surface/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/admin" className="font-display text-sm font-bold uppercase tracking-[0.12em] text-gold">
          GNL Admin
        </Link>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
