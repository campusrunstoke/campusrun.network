"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "./SiteChrome";

/**
 * Marketing homepage — the "Reveal" scroll.
 *
 * Two full-viewport panels are stacked as `position: fixed`; a 220vh spacer
 * provides the scroll range. As you scroll, the immersive hero (front, z2) slides
 * straight up and off, uncovering the white data-console section fixed beneath it
 * (back, z1). The transform tracks scroll 1:1 — no easing — which is what makes it
 * feel native.
 *
 * prefers-reduced-motion → the two panels render as a plain stacked scroll instead.
 *
 * Palette is the Campus Run design system (ink + white + scarce gold). Gold Rule:
 * gold only marks something earned or live (the "converted." word, the LIVE pill,
 * the Converted metric) — never decoration.
 */

const WHITE_72 = "rgba(255,255,255,.72)";
const WHITE_78 = "rgba(255,255,255,.78)";
const WHITE_65 = "rgba(255,255,255,.65)";
const CARD_FILL = "rgba(255,255,255,.06)";
const CARD_LINE = "rgba(255,255,255,.12)";
const PILOT = "/request-a-pilot";

export default function HomeLanding() {
  const [reduced, setReduced] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);

  // Detect reduced-motion preference (and react to changes).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // The reveal transform. rAF-guarded so scroll writes stay off the critical path.
  useEffect(() => {
    if (reduced) return;
    let ticking = false;
    const apply = () => {
      ticking = false;
      const h = window.innerHeight || 1;
      const p = Math.max(0, Math.min(1, window.scrollY / h));
      const f = frontRef.current;
      if (!f) return;
      f.style.transform = `translateY(${-100 * p}%)`;
      f.style.pointerEvents = p < 0.5 ? "auto" : "none";
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  const toConsole = () =>
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const hero = <Hero onSeeHow={toConsole} reduced={reduced} />;
  const console_ = <Console onBackTop={toTop} />;

  if (reduced) {
    return (
      <div>
        <section className="relative min-h-dvh overflow-hidden bg-ink">{hero}</section>
        <section className="relative min-h-dvh overflow-hidden bg-white">
          {console_}
        </section>
        <SiteFooter tagline="stop guessing. get stoked" />
      </div>
    );
  }

  return (
    <div>
      {/* The reveal region. The console is `sticky` (not fixed), so once the hero
          has slid off and you scroll past it, the console scrolls up normally and
          the footer below flows into view — the reveal itself is unchanged. */}
      <div className="relative" style={{ height: "220vh" }}>
        <div className="sticky top-0 z-[1] h-dvh overflow-hidden bg-white">
          {console_}
        </div>
        <div
          ref={frontRef}
          className="fixed inset-0 z-[2] overflow-hidden bg-ink"
          style={{ willChange: "transform" }}
        >
          {hero}
        </div>
      </div>
      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}

/* ------------------------------- Panel A: hero ------------------------------ */

function Hero({
  onSeeHow,
  reduced,
}: {
  onSeeHow: () => void;
  reduced: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Blurred activation photo over solid ink, with a diagonal ink wash on top. */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/hero-activation.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-50"
          style={{
            objectPosition: "center 34%",
            filter: "blur(30px) saturate(1.15)",
            transform: "scale(1.2)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg,rgba(0,32,50,.94) 0%,rgba(0,32,50,.66) 52%,rgba(0,32,50,.42) 100%)",
          }}
        />
      </div>

      {/* Decorative concentric-circles + crosshair, top-right. */}
      <svg
        width="360"
        height="360"
        viewBox="0 0 320 320"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute z-[1] opacity-[.18]"
        style={{ right: "-40px", top: "6%" }}
      >
        <circle cx="160" cy="160" r="56" stroke="#FFCC00" strokeWidth="1.1" />
        <circle cx="160" cy="160" r="98" stroke="#fff" strokeWidth="1" />
        <circle cx="160" cy="160" r="140" stroke="#fff" strokeWidth=".8" opacity=".5" />
        <path d="M160 40v40M160 240v40M40 160h40M240 160h40" stroke="#fff" strokeWidth="1" />
        <circle cx="160" cy="160" r="3.5" fill="#FFCC00" />
      </svg>

      <div className="relative z-[3] flex min-h-dvh flex-col">
        <Nav onHowItWorks={onSeeHow} />

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-8">
            <div className="max-w-[680px]">
              <div
                className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: WHITE_72 }}
              >
                <Icon.Pulse className="text-gold" size={15} />
                Attribution is the spine
              </div>
              <h1 className="m-0 font-display text-[40px] font-medium leading-[1.04] tracking-[-0.025em] text-white text-balance sm:text-[54px] lg:text-[64px] lg:leading-[1.02]">
                We tell you exactly where and when the product actually{" "}
                <span className="text-gold">converted.</span>
              </h1>
              <p
                className="mb-9 mt-6 max-w-[33em] text-[17px] leading-[1.6] sm:text-[18px]"
                style={{ color: WHITE_78 }}
              >
                The activation is the surface. The attribution underneath is the
                product, and it&rsquo;s the one thing no other activation gives you.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href={PILOT}
                  className="rounded-full bg-white px-7 py-[15px] text-[15px] font-semibold text-ink"
                >
                  Request a pilot
                </Link>
                <button
                  type="button"
                  onClick={onSeeHow}
                  className="cursor-pointer text-[15px] font-semibold text-white"
                >
                  See how attribution works &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {!reduced && (
          <button
            type="button"
            onClick={onSeeHow}
            className="flex cursor-pointer flex-col items-center gap-1.5 self-center pb-8"
            style={{ color: "rgba(255,255,255,.62)" }}
            aria-label="Scroll to how attribution works"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Scroll
            </span>
            <Icon.ChevronDown size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function Nav({ onHowItWorks }: { onHowItWorks: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 pt-6 sm:px-8">
      <nav
        className="flex items-center justify-between rounded-full py-[11px] pl-[22px] pr-3"
        style={{
          background: "rgba(255,255,255,.96)",
          boxShadow: "0 4px 18px rgba(0,0,0,.22)",
        }}
      >
        <div className="flex items-center gap-[9px]">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink" />
          <span className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink">
            Campus Run
          </span>
        </div>
        <div className="hidden items-center gap-[26px] text-[14px] font-medium text-ink md:flex">
          <Link href="/for-brands">For brands</Link>
          <button type="button" onClick={onHowItWorks} className="cursor-pointer">
            How it works
          </button>
          <Link href="/good-company">Good company</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="hidden text-[14px] font-semibold text-ink sm:inline"
          >
            Login
          </Link>
          <Link
            href={PILOT}
            className="rounded-full bg-ink px-[18px] py-2.5 text-[14px] font-semibold text-white"
          >
            Request a pilot
          </Link>
        </div>
      </nav>
    </div>
  );
}

/* ---------------------------- Panel B: console ------------------------------ */

function Console({ onBackTop }: { onBackTop: () => void }) {
  return (
    <div className="flex min-h-dvh items-center">
      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-12 px-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <Icon.Scan className="text-ink" size={15} />
            Data vs guesswork
          </div>
          <h2 className="m-0 font-display text-[38px] font-medium leading-[1.06] tracking-[-0.025em] text-ink text-balance sm:text-[48px] lg:text-[56px] lg:leading-[1.04]">
            Every touch, on the record.
          </h2>
          <p className="mb-8 mt-5 max-w-[34em] text-[17px] leading-[1.6] text-muted sm:text-[18px]">
            A per-event code ties each physical moment to what it drove. The whole
            activation reads back as live numbers, not a hunch.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              href={PILOT}
              className="rounded-full bg-ink px-[26px] py-3.5 text-[15px] font-semibold text-white"
            >
              Request a pilot
            </Link>
            <Link
              href="/admin/login"
              className="rounded-full border border-[var(--color-line)] px-6 py-[13px] text-[15px] font-semibold text-ink"
              style={{ borderColor: "#D2D2D7" }}
            >
              See a live dashboard
            </Link>
          </div>
          <button
            type="button"
            onClick={onBackTop}
            className="mt-9 inline-flex cursor-pointer items-center gap-[7px] text-[13px] font-semibold text-muted"
          >
            <Icon.ChevronUp size={16} />
            Back to top
          </button>
        </div>

        <ConsoleCard />
      </div>
    </div>
  );
}

function ConsoleCard() {
  return (
    <div
      className="rounded-2xl bg-ink p-[18px]"
      style={{ boxShadow: "0 24px 60px rgba(0,32,50,.28)" }}
    >
      {/* Header: thumbnail + event name + code, LIVE pill. */}
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 flex-none overflow-hidden rounded-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/console-thumb.jpg"
              alt="Activation on Bruinwalk"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white">
              UCLA &times; ACE Health Clinic
            </div>
            <div
              className="mt-0.5 font-mono text-[11px]"
              style={{ color: "rgba(255,255,255,.6)" }}
            >
              ACE&middot;BW&middot;0423
            </div>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-semibold text-white"
          style={{
            background: "rgba(255,204,0,.18)",
            border: "1px solid rgba(255,204,0,.32)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          LIVE
        </span>
      </div>

      {/* 2x2 metric grid. */}
      <div className="grid grid-cols-2 gap-2.5">
        <Metric icon={<Icon.Bars size={18} />} label="Opt-ins" value="1,284" />
        <Metric icon={<Icon.Target size={18} />} label="Converted" value="312" gold />
        <Metric icon={<Icon.Pulse size={18} />} label="Repeat rate" value="71%" />
        <Metric
          icon={<Icon.Pin size={18} />}
          label="Top spot"
          value={
            <span className="text-[16px] font-semibold leading-[1.2]">
              Bruinwalk
              <br />
              11am
            </span>
          }
        />
      </div>

      {/* Live-feed strip. */}
      <div
        className="mt-2.5 flex items-center gap-2.5 rounded-xl px-3.5 py-3"
        style={{ background: CARD_FILL, border: `1px solid ${CARD_LINE}` }}
      >
        <span style={{ color: "rgba(255,255,255,.75)" }}>
          <Icon.Clock size={17} />
        </span>
        <span className="font-mono text-[12px]" style={{ color: "rgba(255,255,255,.8)" }}>
          14:02 &middot; scan traced to table &middot; +1 conversion
        </span>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  gold,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={
        gold
          ? { background: "rgba(255,204,0,.1)", border: "1px solid rgba(255,204,0,.3)" }
          : { background: CARD_FILL, border: `1px solid ${CARD_LINE}` }
      }
    >
      <span style={{ color: gold ? "var(--color-gold)" : "rgba(255,255,255,.75)" }}>
        {icon}
      </span>
      <div className="mt-2 text-[11px]" style={{ color: WHITE_65 }}>
        {label}
      </div>
      {typeof value === "string" ? (
        <div
          className="font-display text-[26px] font-black leading-none tabular-nums"
          style={{ color: gold ? "var(--color-gold)" : "#fff" }}
        >
          {value}
        </div>
      ) : (
        <div className="mt-0.5 text-white">{value}</div>
      )}
    </div>
  );
}

/* --------------------------------- Icons ----------------------------------- */
// Inline stroke SVGs, ~2px, round caps/joins, currentColor. No icon font.

type IconProps = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const Icon = {
  Pulse: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  ),
  Scan: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  ),
  Bars: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M4 20v-4M10 20v-8M16 20v-12M22 20v-6" />
    </svg>
  ),
  Target: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
    </svg>
  ),
  Pin: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  Clock: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  ChevronDown: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  ChevronUp: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ),
};
