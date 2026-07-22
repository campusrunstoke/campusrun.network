"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "Submissions" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/leads", label: "Intake" },
];

export default function AdminHeader({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070B14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              CAMPUS RUN
            </span>
            <span className="hidden rounded-md border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FFCC00] sm:inline">
              Ops
            </span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-[#9AA6B8] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="text-right leading-tight">
            <div className="max-w-[90px] truncate text-xs font-medium text-white sm:max-w-none">
              {name}
            </div>
            <div className="hidden text-[10px] uppercase tracking-wider text-[#6B7688] sm:block">
              {role}
            </div>
          </div>
          <button
            onClick={logout}
            disabled={busy}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#9AA6B8] transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
