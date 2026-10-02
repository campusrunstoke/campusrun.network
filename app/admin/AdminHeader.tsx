"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Wallet campaigns are the product now, so they lead. The older rating/redirect
// tools still hold data people may need, so they stay one click away under Legacy.
const NAV = [
  { href: "/admin/wallet", label: "Campaigns" },
  { href: "/admin/leads", label: "Brand intake" },
];
const LEGACY = [
  { href: "/admin/submissions", label: "Ratings & taps", hint: "Stoke ratings from the original NFC flow" },
  { href: "/admin/campaigns", label: "Link campaigns", hint: "One-link-per-drop redirects, pre-Wallet" },
];

export default function AdminHeader({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Remember which page the menu was opened on, so navigating closes it without an effect.
  const [legacyOpenAt, setLegacyOpenAt] = useState<string | null>(null);
  const legacyOpen = legacyOpenAt === pathname;
  const setLegacyOpen = (v: boolean | ((cur: boolean) => boolean)) =>
    setLegacyOpenAt(typeof v === "function" ? (v(legacyOpen) ? pathname : null) : v ? pathname : null);
  const legacyRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the Legacy menu on a click outside both the button and the menu itself.
  useEffect(() => {
    if (!legacyOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!legacyRef.current?.contains(t) && !menuRef.current?.contains(t)) setLegacyOpenAt(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [legacyOpen]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const legacyActive = LEGACY.some((l) => pathname.startsWith(l.href));
  const pill = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-ink text-white" : "text-ink/70 hover:bg-fill hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/admin/wallet" className="flex shrink-0 items-center gap-[9px]">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink" />
          <span className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink">
            Campus Run
          </span>
          <span className="hidden rounded-full bg-fill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:inline">
            Ops
          </span>
        </Link>

        <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pill(pathname.startsWith(item.href))}>
              {item.label}
            </Link>
          ))}
          <div ref={legacyRef} className="relative">
            <button onClick={() => setLegacyOpen((v) => !v)} className={pill(legacyActive)} aria-expanded={legacyOpen}>
              Legacy <span aria-hidden className="ml-0.5 text-xs">▾</span>
            </button>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs font-semibold text-ink">{name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{role}</div>
          </div>
          <button
            onClick={logout}
            disabled={busy}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Rendered outside the scrolling nav so it isn't clipped on narrow screens. */}
      {legacyOpen && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div ref={menuRef} className="absolute z-30 mt-1 w-72 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,.12)]">
            {LEGACY.map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 hover:bg-fill">
                <div className="text-sm font-semibold text-ink">{l.label}</div>
                <div className="mt-0.5 text-xs text-muted">{l.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
