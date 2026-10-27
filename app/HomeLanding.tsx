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
 * gold only marks something earned (the "worked." word, the passes-kept metric) —
 * never decoration.
 *
 * Panel B shows the one real activation: Pocari Sweat × LMU Wellness Wednesday,
 * Oct 14 2026. Numbers come from the Campus Run activation report (data through
 * Oct 21 2026). Change them only when there is a new report.
 */

const WHITE_72 = "rgba(255,255,255,.72)";
const WHITE_78 = "rgba(255,255,255,.78)";
const WHITE_65 = "rgba(255,255,255,.65)";
const CARD_FILL = "rgba(255,255,255,.06)";
const CARD_LINE = "rgba(255,255,255,.12)";
const PILOT = "/request-a-pilot";

export default function HomeLanding() {
  const [reduced, setReduced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);

  // The scroll reveal is a desktop enhancement. On phones/tablets the two panels'
  // content is taller than one viewport, so a fixed one-viewport reveal would clip
  // it and leak the ink background around the white panel. There — and under
  // prefers-reduced-motion — we fall back to a plain stacked scroll.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const size = window.matchMedia("(max-width: 1023px)");
    const setMotion = () => setReduced(motion.matches);
    const setSize = () => setNarrow(size.matches);
    setMotion();
    setSize();
    motion.addEventListener("change", setMotion);
    size.addEventListener("change", setSize);
    return () => {
      motion.removeEventListener("change", setMotion);
      size.removeEventListener("change", setSize);
    };
  }, []);

  const stacked = reduced || narrow;

  // The reveal transform. rAF-guarded so scroll writes stay off the critical path.
  useEffect(() => {
    if (stacked) return;
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
  }, [stacked]);

  const toConsole = () =>
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const hero = <Hero onSeeHow={toConsole} reduced={stacked} />;
  const console_ = <Console onBackTop={toTop} />;

  if (stacked) {
    return (
      <div>
        <section className="relative min-h-dvh overflow-hidden bg-ink">{hero}</section>
        <section className="relative bg-white">{console_}</section>
        <DayAndReport />
        <Menu />
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
      <DayAndReport />
      <Menu />
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
      {/* Ice Slurry pouches at the LMU table, Oct 14 2026 (photo: Gofer), under a
          diagonal ink wash: dark on the left where the copy sits, lighter on the
          right so the product stays visible. */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/pocari-lmu-ledge.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center 45%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg,rgba(0,32,50,.9) 0%,rgba(0,32,50,.7) 48%,rgba(0,32,50,.3) 100%)",
          }}
        />
      </div>

      <div className="relative z-[3] flex min-h-dvh flex-col">
        <Nav onProof={onSeeHow} />

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-8">
            <div className="max-w-[680px]">
              <div
                className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: WHITE_72 }}
              >
                <Icon.Pulse className="text-gold" size={15} />
                Measured Wallet Proof
              </div>
              <h1 className="m-0 font-display text-[40px] font-medium leading-[1.04] tracking-[-0.025em] text-white text-balance sm:text-[54px] lg:text-[64px] lg:leading-[1.02]">
                Prove your sampling day <span className="text-gold">worked.</span>
              </h1>
              <p
                className="mb-9 mt-6 max-w-[33em] text-[17px] leading-[1.6] sm:text-[18px]"
                style={{ color: WHITE_78 }}
              >
                You already run the booth. We add the measurement: an NFC card on
                the table, a pass in Apple Wallet, tracked links, and a report that
                shows who tapped, who added, who kept it, and who clicked.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href={PILOT}
                  className="rounded-full bg-white px-7 py-[15px] text-[15px] font-semibold text-ink"
                >
                  Book a call
                </Link>
                <button
                  type="button"
                  onClick={onSeeHow}
                  className="cursor-pointer text-[15px] font-semibold text-white"
                >
                  See the Pocari &times; LMU numbers &darr;
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
            aria-label="Scroll to the Pocari Sweat × LMU numbers"
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

function Nav({ onProof }: { onProof: () => void }) {
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
          <button type="button" onClick={onProof} className="cursor-pointer">
            Proof
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
            Book a call
          </Link>
        </div>
      </nav>
    </div>
  );
}

/* ---------------------------- Panel B: console ------------------------------ */

function Console({ onBackTop }: { onBackTop: () => void }) {
  return (
    <div id="proof" className="relative flex min-h-dvh items-center overflow-hidden bg-white">
      <div className="relative z-[1] mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-12 px-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <Icon.Scan className="text-ink" size={15} />
            Pocari Sweat &times; LMU &middot; Oct 14, 2026
          </div>
          <h2 className="m-0 font-display text-[38px] font-medium leading-[1.06] tracking-[-0.025em] text-ink text-balance sm:text-[48px] lg:text-[56px] lg:leading-[1.04]">
            94 people tapped. 64 still carry Pocari in their Wallet.
          </h2>
          <p className="mb-8 mt-5 max-w-[34em] text-[17px] leading-[1.6] text-muted sm:text-[18px]">
            One table at the Wellness Wednesday market, 11 AM to 2 PM, 200+ Ice
            Slurry samples. Every number here came off the cards and the passes.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href={PILOT}
              className="rounded-full bg-ink px-[26px] py-3.5 text-[15px] font-semibold text-white"
            >
              Book a call
            </Link>
            <a href="#menu" className="text-[15px] font-semibold text-ink">
              What you can buy &darr;
            </a>
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

        <FunnelCard />
      </div>
    </div>
  );
}

/** The Pocari × LMU funnel, straight from the activation report. */
function FunnelCard() {
  return (
    <div
      className="rounded-2xl bg-ink p-[18px]"
      style={{ boxShadow: "0 24px 60px rgba(0,32,50,.28)" }}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 flex-none overflow-hidden rounded-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/pocari-lmu-table.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white">
              Pocari Sweat &times; LMU Wellness Wednesday
            </div>
            <div
              className="mt-0.5 font-mono text-[11px]"
              style={{ color: "rgba(255,255,255,.6)" }}
            >
              Wed Oct 14, 2026 &middot; 11 AM&ndash;2 PM PT &middot; one table
            </div>
          </div>
        </div>
        <span
          className="inline-flex flex-none items-center rounded-full px-2.5 py-[5px] text-[11px] font-semibold text-white"
          style={{ background: CARD_FILL, border: `1px solid ${CARD_LINE}` }}
        >
          Activation report
        </span>
      </div>

      {/* The four tracked steps, in funnel order. */}
      <div className="grid grid-cols-2 gap-2.5">
        <Metric icon={<Icon.Scan size={18} />} label="Tapped a card" value="94" sub="114 taps" />
        <Metric
          icon={<Icon.Wallet size={18} />}
          label="Added to Apple Wallet"
          value="65"
          sub="69% of people who tapped"
        />
        <Metric
          icon={<Icon.Check size={18} />}
          label="Still in Wallet"
          value="64"
          sub="1 removed, as of Oct 21"
          gold
        />
        <Metric
          icon={<Icon.ArrowUpRight size={18} />}
          label="Clicked through"
          value="26"
          sub="43 clicks: 39 shop offer, 4 Instagram"
        />
      </div>

      <p
        className="mb-0 mt-2.5 rounded-xl px-3.5 py-3 text-[12px] leading-[1.5]"
        style={{ background: CARD_FILL, border: `1px solid ${CARD_LINE}`, color: "rgba(255,255,255,.75)" }}
      >
        Taps, Wallet adds and clicks were tracked by Campus Run. The 200+ samples
        are an on-site estimate; the table ran out.
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  gold,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
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
      <div
        className="font-display text-[26px] font-black leading-none tabular-nums"
        style={{ color: gold ? "var(--color-gold)" : "#fff" }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] leading-[1.35]" style={{ color: WHITE_65 }}>
        {sub}
      </div>
    </div>
  );
}

/* -------------------------- The day, and the report ------------------------- */

/**
 * Normal-flow section under the reveal: page one of the report Pocari received,
 * and two of Gofer's stills from the table. Real pictures of the real day; no
 * stock, nothing generated.
 */
function DayAndReport() {
  return (
    <section className="border-t border-line bg-white">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-16 sm:px-8 sm:py-20">
        <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <Icon.Pulse className="text-ink" size={15} />
          The day, and the report
        </div>
        <p className="mb-8 max-w-[38em] text-[17px] leading-[1.6] text-muted sm:text-[18px]">
          Photos from the table on Oct 14, shot by Gofer. The still below is page one
          of the report Pocari received: the funnel, and card taps by half hour.
        </p>

        <figure className="m-0 overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/pocari-lmu-report.jpg"
            alt="Page one of the Pocari Sweat × LMU activation report: 200+ samples, 94 people tapped a card, 65 Apple Wallet passes, 64 still in wallets, the funnel, and a chart of card taps and Wallet adds in 30-minute bins"
            className="block h-auto w-full"
            loading="lazy"
          />
        </figure>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <figure className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/pocari-lmu-table.jpg"
              alt="A student holding up an Ice Slurry pouch in front of the Pocari Sweat tent at LMU"
              className="aspect-[4/3] w-full rounded-2xl object-cover"
              loading="lazy"
            />
            <figcaption className="mt-2 text-[13px] text-muted">
              The Pocari Sweat table at the Wellness Wednesday market.
            </figcaption>
          </figure>
          <figure className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/pocari-lmu-wheel.jpg"
              alt="A staffer behind the Pocari Sweat table with the prize wheel and samples"
              className="aspect-[4/3] w-full rounded-2xl object-cover"
              style={{ objectPosition: "center 30%" }}
              loading="lazy"
            />
            <figcaption className="mt-2 text-[13px] text-muted">
              Prize wheel and samples at the table.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Menu ----------------------------------- */

const MENU = [
  {
    name: "Core",
    role: "Wallet proof.",
    body: "NFC cards at your table, an Apple Wallet pass, tracked links, and the report: who tapped, who added, who kept it, who clicked.",
  },
  {
    name: "Plus",
    role: "Re-engage.",
    body: "One update later from the brand to everyone who kept the pass: a new product, an event, where to buy. Clicks reported.",
  },
  {
    name: "Advanced",
    role: "In-store.",
    body: "A coupon barcode on the pass that a cashier scans, so a purchase ties back to the tap. Only when a store will scan.",
  },
];

/** Names and what each layer does. No prices on the site: a day gets scoped on a call. */
function Menu() {
  return (
    <section id="menu" className="border-t border-line bg-fill">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-16 sm:px-8 sm:py-20">
        <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <Icon.Wallet className="text-ink" size={15} />
          Three ways to run it
        </div>
        <h2 className="m-0 font-display text-[32px] font-medium leading-[1.08] tracking-[-0.025em] text-ink sm:text-[40px]">
          Core, Plus, Advanced.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
          {MENU.map((m) => (
            <div key={m.name} className="border-t border-ink pt-5">
              <h3 className="m-0 font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
                {m.name}
              </h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-ink">
                <span className="font-semibold">{m.role} </span>
                <span className="text-muted">{m.body}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="m-0 max-w-[36em] text-[15px] leading-[1.6] text-muted">
            No prices here. Quoting a sampling day before seeing it is guesswork, so
            tell us about yours and we&rsquo;ll scope it on a call.
          </p>
          <Link
            href={PILOT}
            className="shrink-0 self-start rounded-full bg-ink px-[26px] py-3.5 text-[15px] font-semibold text-white sm:self-auto"
          >
            Book a call
          </Link>
        </div>
      </div>
    </section>
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
  Wallet: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14.5h2" />
    </svg>
  ),
  Check: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  ArrowUpRight: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
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
