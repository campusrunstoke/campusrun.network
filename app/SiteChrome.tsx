import Link from "next/link";

/**
 * Shared marketing chrome + primitives, so /for-brands and /good-company wear the
 * exact homepage design system: ink + white + scarce gold, Satoshi display over
 * Geist body. Gold Rule holds — gold appears only on the hero eyebrow mark, the
 * thesis callout's edge, and the footer tagline; nothing else.
 *
 * These are server components (no interactivity) — good for SEO and speed.
 */

const WHITE_72 = "rgba(255,255,255,.72)";
const WHITE_78 = "rgba(255,255,255,.78)";

/* --------------------------------- Nav ------------------------------------- */

export function SiteNav() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 pt-6 sm:px-8">
      <nav
        className="flex items-center justify-between rounded-full py-[11px] pl-[22px] pr-3"
        style={{
          background: "rgba(255,255,255,.96)",
          boxShadow: "0 4px 18px rgba(0,0,0,.22)",
        }}
      >
        <Link href="/" className="flex items-center gap-[9px]">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink" />
          <span className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink">
            Campus Run
          </span>
        </Link>
        <div className="hidden items-center gap-[26px] text-[14px] font-medium text-ink md:flex">
          <Link href="/for-brands">For brands</Link>
          <Link href="/">How it works</Link>
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
            href="/request-a-pilot"
            className="rounded-full bg-ink px-[18px] py-2.5 text-[14px] font-semibold text-white"
          >
            Request a pilot
          </Link>
        </div>
      </nav>
    </div>
  );
}

/* -------------------------------- Hero ------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-ink">
      {/* Same blurred activation photo + diagonal ink wash as the homepage hero. */}
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
      <svg
        width="360"
        height="360"
        viewBox="0 0 320 320"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute z-[1] opacity-[.18]"
        style={{ right: "-40px", top: "8%" }}
      >
        <circle cx="160" cy="160" r="56" stroke="#FFCC00" strokeWidth="1.1" />
        <circle cx="160" cy="160" r="98" stroke="#fff" strokeWidth="1" />
        <circle cx="160" cy="160" r="140" stroke="#fff" strokeWidth=".8" opacity=".5" />
        <path d="M160 40v40M160 240v40M40 160h40M240 160h40" stroke="#fff" strokeWidth="1" />
        <circle cx="160" cy="160" r="3.5" fill="#FFCC00" />
      </svg>

      <div className="relative z-[3]">
        <SiteNav />
        <div className="mx-auto w-full max-w-[1120px] px-6 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20">
          <div className="max-w-[760px]">
            <div
              className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: WHITE_72 }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12h4l3 8 4-16 3 8h4" />
              </svg>
              {eyebrow}
            </div>
            <h1 className="m-0 font-display text-[38px] font-medium leading-[1.05] tracking-[-0.025em] text-white text-balance sm:text-[52px] sm:leading-[1.02]">
              {title}
            </h1>
            <div className="mt-6" style={{ color: WHITE_78 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------- White-section primitives ------------------------ */

export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 first:mt-0">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-px w-6 flex-none bg-ink" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** The one-line thesis — the only structural gold on the page. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-[3px] border-gold pl-5 font-display text-[22px] font-medium leading-[1.4] text-ink sm:text-[24px]">
      {children}
    </p>
  );
}

export function PointGrid({
  points,
}: {
  points: { head: string; body: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
      {points.map((p) => (
        <div key={p.head} className="border-t border-line pt-4">
          <p className="text-[15px] leading-[1.6] text-ink">
            <span className="font-semibold">{p.head} </span>
            <span className="text-muted">{p.body}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function Steps({
  steps,
}: {
  steps: { head: string; body: string }[];
}) {
  return (
    <ol className="grid list-none grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
      {steps.map((s, i) => (
        <li key={s.head} className="flex gap-3.5">
          <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white tabular-nums">
            {i + 1}
          </span>
          <p className="text-[15px] leading-[1.55] text-ink">
            <span className="font-semibold">{s.head} </span>
            <span className="text-muted">{s.body}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function BulletList({
  items,
}: {
  items: React.ReactNode[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.55] text-ink">
          <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-ink" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** The closing ask — an ink card echoing the homepage console, with the CTA. */
export function AskCard({
  children,
  cta = "Request a pilot",
}: {
  children: React.ReactNode;
  cta?: string;
}) {
  return (
    <div
      className="flex flex-col gap-5 rounded-2xl bg-ink p-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      style={{ boxShadow: "0 24px 60px rgba(0,32,50,.28)" }}
    >
      <p className="text-[15px] leading-[1.6]" style={{ color: WHITE_78 }}>
        {children}
      </p>
      <Link
        href="/request-a-pilot"
        className="shrink-0 self-start rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-ink sm:self-auto"
      >
        {cta}
      </Link>
    </div>
  );
}

/* -------------------------------- Footer ----------------------------------- */

export function SiteFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3 px-6 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          Kasey Tarbet&nbsp;&nbsp;·&nbsp;&nbsp;kasey@campusrun.network&nbsp;&nbsp;·&nbsp;&nbsp;campusrun.network
        </div>
        <div className="font-semibold text-gold">{tagline}</div>
      </div>
    </footer>
  );
}
