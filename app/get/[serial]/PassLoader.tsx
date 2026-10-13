"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "loading" | "waiting" | "added";

/**
 * Starts the pass download (Safari opens Apple's Add sheet over this page), then watches
 * for Apple's registration call to flip to "Added". If nothing happens after a few
 * seconds — they cancelled, or the sheet didn't open — it offers the button again.
 */
export default function PassLoader({
  serial,
  brand,
  colors,
  next,
}: {
  serial: string;
  brand: string;
  colors: { bg: string; fg: string; label: string };
  next: { href: string; label: string } | null;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // A short beat so the loading screen paints before Safari hands off to Wallet.
    const go = setTimeout(() => {
      window.location.href = `/pass/${serial}`;
    }, 400);
    const showRetry = setTimeout(() => setPhase((p) => (p === "loading" ? "waiting" : p)), 6000);

    let stop = false;
    const poll = async () => {
      while (!stop) {
        try {
          const r = await fetch(`/api/pass/${serial}/status`, { cache: "no-store" });
          if (r.ok && (await r.json()).added) {
            setPhase("added");
            return;
          }
        } catch {}
        await new Promise((res) => setTimeout(res, 1500));
      }
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(go);
      clearTimeout(showRetry);
    };
  }, [serial]);

  return (
    <main
      className="flex min-h-dvh w-full flex-col items-center justify-center px-6 text-center"
      style={{
        color: colors.fg,
        background: `linear-gradient(180deg, ${colors.bg} 0%, color-mix(in srgb, ${colors.bg} 72%, black) 100%)`,
        paddingTop: "max(24px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center gap-2 text-[13px] font-bold">
        <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: colors.fg }} />
        Campus Run × {brand}
      </div>

      {phase !== "added" ? (
        <>
          <div
            className="mt-10 h-14 w-14 animate-spin rounded-full border-4 border-current border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
          <h1 className="mt-8 font-display text-[30px] font-bold leading-tight tracking-[-0.02em]">
            Your {brand} pass is loading…
          </h1>
          <p className="mt-3 max-w-xs text-[16px] leading-relaxed" style={{ color: colors.label }}>
            Tap <b style={{ color: colors.fg }}>Add</b> when Apple Wallet asks.
          </p>
          {phase === "waiting" && (
            <a
              href={`/pass/${serial}`}
              className="mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-white font-display text-[17px] font-bold"
              style={{ color: colors.bg }}
            >
              Add to Apple Wallet
            </a>
          )}
        </>
      ) : (
        <>
          <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl font-bold" style={{ color: colors.bg }} aria-hidden>
            ✓
          </div>
          <h1 className="mt-8 font-display text-[30px] font-bold leading-tight tracking-[-0.02em]">Added to your Wallet!</h1>
          <p className="mt-3 max-w-xs text-[16px] leading-relaxed" style={{ color: colors.label }}>
            Open the <b style={{ color: colors.fg }}>Wallet</b> app to see your {brand} pass.
          </p>
          {next && (
            <a
              href={next.href}
              className="mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-white font-display text-[17px] font-bold"
              style={{ color: colors.bg }}
            >
              {next.label}
            </a>
          )}
        </>
      )}
    </main>
  );
}
