import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletCards, walletLinks, walletStores } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import {
  campaignFunnel,
  conversions,
  deviceSplit,
  clicksByAction,
  redemptionsByStore,
  redemptionsByMethod,
  redemptionsByHour,
  redemptionsByDow,
  passInstallState,
  tapsByHour,
  recentEvents,
} from "@/lib/wallet/stats";
import QRCode from "qrcode";
import { cardUrl } from "@/lib/wallet/cards";
import AdminShell from "../../AdminShell";
import TapsChart from "./TapsChart";
import CampaignTools from "./CampaignTools";
import { appleButtonLabel, featuredLinks } from "@/lib/wallet/featured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet campaign · Campus Run" };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pacific = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (d: Date) => pacific.format(d).replace(",", "");

export default async function WalletCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) notFound();

  const [funnel, devices, actions, stores, methods, byHour, byDow, installs, series, events, cards, links, storeRows, passRows] =
    await Promise.all([
      campaignFunnel(id),
      deviceSplit(id),
      clicksByAction(id),
      redemptionsByStore(id),
      redemptionsByMethod(id),
      redemptionsByHour(id),
      redemptionsByDow(id),
      passInstallState(id),
      tapsByHour(id),
      recentEvents(id, 100),
      db.select().from(walletCards).where(eq(walletCards.campaignId, id)).orderBy(walletCards.id),
      db.select().from(walletLinks).where(eq(walletLinks.campaignId, id)),
      db.select().from(walletStores).where(eq(walletStores.campaignId, id)).orderBy(desc(walletStores.createdAt)),
      db.select().from(passes).where(eq(passes.campaignId, id)),
    ]);
  const conv = conversions(funnel);

  // QR for the cards shown in the console — this is what gets printed on the back of a
  // card (§1 "or scans the QR on the back") and it's how you demo a tap without a card
  // in hand. Capped: rendering hundreds of data URLs would bloat the page for no gain.
  const QR_LIMIT = 12;
  const qrByCard = new Map(
    await Promise.all(
      cards.slice(0, QR_LIMIT).map(
        async (c) =>
          [
            c.id,
            await QRCode.toDataURL(cardUrl(c.id), {
              margin: 1,
              width: 480,
              color: { dark: "#003B5C", light: "#FFFFFF" },
            }),
          ] as const,
      ),
    ),
  );
  // A card only has a pass once someone taps it. Surfacing the pass's coupon and redeem
  // links here is what lets you test the cashier flow (and look one up for support) —
  // in the field the cashier never types it, they scan the barcode that encodes it.
  const passByCard = new Map(passRows.map((p) => [p.cardId, p]));
  const cardRows = cards.map((c) => {
    const pass = passByCard.get(c.id);
    return {
      id: c.id,
      url: cardUrl(c.id),
      active: c.active,
      qr: qrByCard.get(c.id) ?? null,
      serial: pass?.serial ?? null,
      redeemed: Boolean(pass?.redeemedAt),
    };
  });
  const totalTaps = devices.reduce((s, d) => s + d.count, 0);

  // Coupon campaigns end at a register; giveaway / free-sample campaigns end at a link.
  // Only show the redemption numbers where redemption is actually part of the flow.
  const usesRedemption = campaign.showBarcode || funnel.redemptions > 0;
  const hasDesign = Boolean(campaign.backgroundPng || campaign.stripPng || campaign.logoPng);
  const tested = installs.installed + installs.removed + installs.redeemed > 0;
  const checklist = [
    { done: hasDesign, label: "Pass design set", hint: "Logo, artwork and text on the pass", href: `/admin/wallet/${id}/design` },
    { done: links.length > 0, label: "Links set", hint: "Where each button on the pass goes", href: `/admin/wallet/${id}/design` },
    { done: cards.length > 0, label: "Cards minted", hint: "Card links ready to encode on NFC chips", href: "#cards" },
    { done: tested, label: "Tested on a phone", hint: "Tap a card or scan its QR, add the pass to Wallet", href: "#cards" },
    { done: campaign.active, label: "Campaign live", hint: "Paused campaigns hand out the web page, not a Wallet pass", href: "#links" },
  ];
  const setupDone = checklist.every((c) => c.done);
  // Only links that actually become iOS 27 front buttons get a button label.
  const front = campaign.passStyle === "poster" ? featuredLinks(links) : [];

  return (
    <AdminShell name={admin.name} role={admin.role}>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/wallet" className="text-xs font-medium text-muted hover:text-ink">
            ← All campaigns
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink">{campaign.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="font-semibold text-ink">{campaign.brand}</span>
            {campaign.venue && <span>· {campaign.venue}</span>}
            <StatusPill active={campaign.active} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/wallet/${id}/design`}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink/30"
          >
            ✎ Design pass
          </Link>
          <Link
            href={`/admin/wallet/${id}/report`}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-deep"
          >
            Brand report
          </Link>
          <a
            href={`/api/export?type=wallet&campaign=${id}`}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink/30"
          >
            ↓ Download data (CSV)
          </a>
        </div>
      </div>

      {/* section jump links */}
      <nav className="sticky top-[57px] z-10 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line bg-fill/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 [scrollbar-width:none]">
        {[
          ["#setup", "Setup"],
          ["#results", "Results"],
          ["#cards", "Cards"],
          ["#links", usesRedemption ? "Links & stores" : "Links"],
          ["#activity", "Activity log"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-ink/70 hover:bg-white hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      {/* 1 · setup checklist */}
      <Section id="setup" title="Setup" sub={setupDone ? "Everything's in place — this campaign is ready for the field." : "Work top to bottom. A campaign is ready when every step is checked."}>
        <ol className="grid gap-2 sm:grid-cols-5">
          {checklist.map((c, i) => (
            <li key={c.label}>
              <Link href={c.href} className={`block h-full rounded-2xl border p-3 transition-colors ${c.done ? "border-line bg-white hover:border-ink/30" : "border-gold bg-gold/10 hover:bg-gold/20"}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${c.done ? "bg-ink text-white" : "border border-ink/30 text-ink"}`}>
                  {c.done ? "✓" : i + 1}
                </span>
                <span className="text-sm font-semibold text-ink">{c.label}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.hint}</p>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      {/* 2 · results — every % is "of people reached" (distinct cards tapped), one honest denominator */}
      <Section id="results" title="Results" sub="Each step of the funnel, as a share of the people who tapped a card.">
        <div className={`grid grid-cols-2 gap-3 ${usesRedemption ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <Stat label="People reached" value={funnel.people} sub={`different cards tapped · ${funnel.taps} tap${funnel.taps === 1 ? "" : "s"} incl. repeats`} />
          <Stat label="Added to Wallet" value={funnel.passesAdded} sub={`${conv.tapToPass}% of people`} />
          <Stat label="Tapped a link" value={funnel.clickers} sub={`${conv.tapToClick}% of people · ${funnel.clicks} link tap${funnel.clicks === 1 ? "" : "s"} total`} />
          {usesRedemption && <Stat label="Redeemed" value={funnel.redemptions} sub={`${conv.tapToRedemption}% of people`} />}
        </div>

        <Panel title="Taps per hour" hint="Pacific time" className="mt-4">
          <TapsChart points={series.map((p) => ({ t: new Date(p.bucket).toISOString(), n: p.count }))} />
        </Panel>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel title="Which links people tapped" hint="each counted before redirecting">
            <Rows rows={actions.map((a) => [linkName(a.action, links), a.count])} total={funnel.clicks} empty="No link taps yet." />
          </Panel>
          <Panel title="Phone type" hint="taps">
            <Rows
              rows={[
                ["iPhone", devices.find((d) => d.device === "ios")?.count ?? 0],
                ["Android (gets the web version)", devices.find((d) => d.device === "android")?.count ?? 0],
                ["Other", devices.find((d) => d.device === "other")?.count ?? 0],
              ]}
              total={totalTaps}
            />
          </Panel>
          <Panel title="Passes right now" hint="current state">
            <Rows
              rows={[
                ["Still in Wallet", installs.installed],
                ["Removed from Wallet", installs.removed],
                ["Opened, never added", installs.created],
                ...(usesRedemption ? [["Redeemed", installs.redeemed] as [string, number]] : []),
              ]}
            />
          </Panel>
          {usesRedemption && (
            <>
              <Panel title="Redemptions by store">
                <Rows
                  rows={stores.map((s) => [s.store, s.count, s.amount ? `$${s.amount.toFixed(2)}` : undefined])}
                  total={funnel.redemptions}
                  empty="No redemptions yet."
                />
              </Panel>
              <Panel title="Redemptions by hour" hint="Pacific time">
                <Rows rows={byHour.map((h) => [hour12(h.hour), h.count])} empty="No redemptions yet." />
              </Panel>
              <Panel title="Redemptions by day">
                <Rows rows={byDow.map((d) => [DOW[d.dow] ?? String(d.dow), d.count])} empty="No redemptions yet." />
                {methods.length > 0 && (
                  <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
                    by method: {methods.map((m) => `${m.method?.replace("_", " ")} ${m.count}`).join(" · ")}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </Section>

      {/* 3–4 · cards, links, stores, on/off */}
      <CampaignTools
        campaignId={id}
        defaultPrefix={campaign.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20)}
        active={campaign.active}
        usesRedemption={usesRedemption}
        cards={cardRows}
        links={links.map((l) => ({
          action: l.action,
          label: l.label,
          destination: l.destination,
          appleButton: front.find((f) => f.link.action === l.action) ? appleButtonLabel(front.find((f) => f.link.action === l.action)!.type) : null,
        }))}
        stores={storeRows.map((s) => ({
          id: s.id,
          name: s.name,
          pin: s.pin,
          legacyPin: Boolean(s.pinHash && !s.pin),
        }))}
      />

      {/* 5 · raw feed */}
      <Section id="activity" title="Activity log" sub={`The last ${events.length} things that happened, newest first. Times in Pacific.`}>
        <Panel title="Recent events">
          {events.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet — tap a card or scan its QR to see it land here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-line first:border-t-0">
                      <td className="whitespace-nowrap py-2 pr-4 font-mono text-muted">{fmt(e.createdAt)}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge(e.type)}`}>
                          {EVENT_NAME[e.type] ?? e.type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-ink">{e.cardId ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted">{e.deviceType === "ios" ? "iPhone" : e.deviceType === "android" ? "Android" : e.deviceType ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted">
                        {e.type === "click" && linkName(e.action, links)}
                        {e.type === "redemption" && `${e.storeName ?? "?"}${e.amount ? ` · $${e.amount}` : ""} · ${e.method}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Section>
    </AdminShell>
  );
}


const EVENT_NAME: Record<string, string> = {
  tap: "Card tapped",
  pass_added: "Added to Wallet",
  pass_removed: "Removed",
  click: "Link tapped",
  redemption: "Redeemed",
};

function linkName(action: string | null, links: { action: string; label: string | null }[]) {
  if (!action) return "—";
  return links.find((l) => l.action === action)?.label || action;
}

function hour12(h: number) {
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted"}`} />
      {active ? "Live" : "Paused"}
    </span>
  );
}

function badge(type: string) {
  switch (type) {
    case "redemption": return "border-gold bg-gold/15 text-ink";
    case "pass_added": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pass_removed": return "border-line bg-fill text-muted";
    case "click": return "border-violet-200 bg-violet-50 text-violet-700";
    default: return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-32">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {sub && <p className="mb-4 mt-0.5 text-sm text-muted">{sub}</p>}
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-bold tabular-nums text-ink">{value.toLocaleString()}</div>
      {sub && <div className="mt-1 text-xs leading-snug text-muted">{sub}</div>}
    </div>
  );
}

function Panel({ title, hint, children, className = "" }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-4 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Label / count / optional extra, with a proportional single-hue bar — magnitude, one hue. */
function Rows({ rows, total, empty }: { rows: [string, number, string?][]; total?: number; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const denom = total ?? rows.reduce((s, r) => s + r[1], 0);
  if (rows.length === 0 || rows.every((r) => r[1] === 0)) {
    return <p className="text-sm text-muted">{empty ?? "Nothing yet."}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {rows.map(([label, n, extra]) => (
        <li key={label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-ink">{label}</span>
            <span className="shrink-0 font-mono tabular-nums text-ink">
              {n.toLocaleString()}
              {extra && <span className="ml-2 text-muted">{extra}</span>}
              {denom > 0 && <span className="ml-2 text-muted">{Math.round((n / denom) * 100)}%</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-fill">
            <div className="h-1.5 rounded-full bg-ink" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
