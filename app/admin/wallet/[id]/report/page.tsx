import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns, walletLinks } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import {
  campaignFunnel,
  conversions,
  clicksByAction,
  redemptionsByStore,
  deviceSplit,
  passInstallState,
  tapsByHour,
  cardLeaderboard,
  giveawayStats,
} from "@/lib/wallet/stats";
import PrintButton from "./PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Brand report · Campus Run" };

/**
 * The page we hand a brand (§6): print it, save it as a PDF, or screenshot it into a
 * deck. Light and on-brand (white / ink / one gold highlight). Totals lead because most
 * activations are a single day; the last-7-days column is for multi-week campaigns.
 * Sections only appear when they apply — a free-sample campaign has no redemptions,
 * and an empty "Redemptions: 0" row would read as a failure rather than "not tracked".
 */
async function loadReport(id: string) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const [week, total, clicks, storesWeek, storesTotal, devices, installs, hours, links, cards, giveaway] = await Promise.all([
    campaignFunnel(id, weekAgo),
    campaignFunnel(id),
    clicksByAction(id),
    redemptionsByStore(id, weekAgo),
    redemptionsByStore(id),
    deviceSplit(id),
    passInstallState(id),
    tapsByHour(id),
    db.select().from(walletLinks).where(eq(walletLinks.campaignId, id)),
    cardLeaderboard(id),
    giveawayStats(id),
  ]);
  return { today, week, total, clicks, storesWeek, storesTotal, devices, installs, hours, links, cards, giveaway };
}

const n = (v: number, one: string, many = one + "s") => `${v.toLocaleString()} ${v === 1 ? one : many}`;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
const fmtHour = (d: Date) =>
  d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", timeZone: "America/Los_Angeles" });

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) notFound();

  const { today, week, total, clicks, storesWeek, storesTotal, devices, installs, hours, links, cards, giveaway } = await loadReport(id);
  const shared = campaign.cardMode === "shared";
  const ct = conversions(total);
  const taps = devices.reduce((s, d) => s + d.count, 0);
  const ios = devices.find((d) => d.device === "ios")?.count ?? 0;
  const usesRedemption = campaign.showBarcode || total.redemptions > 0;
  const multiWeek = week.taps !== total.taps; // only show the 7-day column once it differs
  const peak = hours.reduce<{ bucket: string; count: number } | null>((m, h) => (!m || h.count > m.count ? h : m), null);
  const linkLabel = (a: string | null) => links.find((l) => l.action === a)?.label || a || "—";

  return (
    <main className="min-h-dvh bg-fill print:bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 pt-6 print:hidden">
        <Link href={`/admin/wallet/${id}`} className="text-sm font-medium text-muted hover:text-ink">← Back to campaign</Link>
        <PrintButton />
      </div>

      <article className="mx-auto my-6 max-w-3xl rounded-3xl bg-white px-8 py-10 text-ink shadow-[0_4px_24px_rgba(0,0,0,.06)] print:my-0 print:rounded-none print:px-0 print:shadow-none">
        <header className="border-b-2 border-ink pb-5">
          <div className="flex items-center gap-[9px]">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink" />
            <span className="font-display text-[15px] font-bold tracking-[-0.02em]">Campus Run</span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.01em]">
            {campaign.brand} — {campaign.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {campaign.venue ? `${campaign.venue} · ` : ""}Activation report · as of {fmtDate(today)}
          </p>
        </header>

        {/* headline numbers */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Big label="People reached" value={total.people} sub={shared ? "different phones" : "different cards tapped"} />
          <Big label="Added to Wallet" value={total.passesAdded} sub={`${ct.tapToPass}% of people`} />
          <Big label="Tapped through" value={total.clickers} sub={`${ct.tapToClick}% of people`} />
          {usesRedemption ? (
            <Big label="Redeemed" value={total.redemptions} sub={`${ct.tapToRedemption}% of people`} gold />
          ) : giveaway ? (
            <Big label="Entered the giveaway" value={giveaway.entries} sub="by text, one per phone number" gold />
          ) : (
            <Big label="Still in Wallet" value={installs.installed} sub="passes kept after the event" />
          )}
        </section>

        {/* funnel table */}
        <section className="mt-10">
          <H2>The funnel</H2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted">
                <th className="py-2">Step</th>
                {multiWeek && <th className="py-2 text-right">Last 7 days</th>}
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Of people reached</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <Row multiWeek={multiWeek} label={shared ? "Scanned a card" : "Tapped a card"} week={week.people} total={total.people} note={`${n(total.taps, "scan")} incl. repeats`} />
              <Row multiWeek={multiWeek} label="Added the pass to Apple Wallet" week={week.passesAdded} total={total.passesAdded} note={`${ct.tapToPass}%`} />
              <Row multiWeek={multiWeek} label="Tapped a link on the pass" week={week.clickers} total={total.clickers} note={`${ct.tapToClick}%`} />
              {giveaway && (
                <tr className="border-t border-line">
                  <td className="py-2.5 font-medium">Entered the giveaway by text</td>
                  {multiWeek && <td className="py-2.5 text-right">—</td>}
                  <td className="py-2.5 text-right font-display text-lg font-bold">{giveaway.entries.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-xs text-muted">{n(giveaway.answered, "answered the question", "answered the question")}</td>
                </tr>
              )}
              {usesRedemption && (
                <Row multiWeek={multiWeek} label="Redeemed in store" week={week.redemptions} total={total.redemptions} note={`${ct.tapToRedemption}%`} />
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-10 grid gap-10 sm:grid-cols-2">
          <div>
            <H2>Where people went</H2>
            {clicks.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No link taps yet.</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {clicks.map((c) => (
                  <Kv key={c.action ?? "-"} k={linkLabel(c.action)} v={`${n(c.people, "person", "people")} · ${n(c.count, "tap")}`} />
                ))}
              </dl>
            )}
          </div>
          <div>
            <H2>Audience</H2>
            <dl className="mt-3 space-y-2 text-sm">
              <Kv k="iPhone share of taps" v={taps ? `${Math.round((ios / taps) * 100)}%` : "—"} />
              <Kv k="Passes still in Wallet" v={installs.installed.toLocaleString()} />
              <Kv k="Passes removed" v={installs.removed.toLocaleString()} />
              {peak && <Kv k="Busiest hour" v={`${fmtHour(new Date(peak.bucket))} · ${n(peak.count, shared ? "scan" : "tap")}`} />}
            </dl>
          </div>
        </section>

        {cards.length > 1 && (
          <section className="mt-10">
            <H2>{shared ? "Scans by card on the table" : "Taps by card"}</H2>
            <dl className="mt-3 space-y-2 text-sm">
              {cards.slice(0, 15).map((c) => (
                <Kv key={c.cardId ?? "-"} k={c.cardId ?? "—"} v={shared ? `${n(c.scans, "scan")} · ${n(c.people, "person", "people")}` : n(c.scans, "tap")} />
              ))}
            </dl>
          </section>
        )}

        {usesRedemption && (
          <section className="mt-10">
            <H2>Redemptions by store</H2>
            {storesTotal.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No redemptions yet.</p>
            ) : (
              <table className="mt-3 w-full border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted">
                    <th className="py-1.5">Store</th>
                    {multiWeek && <th className="py-1.5 text-right">Last 7 days</th>}
                    <th className="py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {storesTotal.map((s) => (
                    <tr key={s.store} className="border-t border-line">
                      <td className="py-1.5">{s.store}</td>
                      {multiWeek && <td className="py-1.5 text-right">{storesWeek.find((w) => w.store === s.store)?.count ?? 0}</td>}
                      <td className="py-1.5 text-right font-semibold">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          {shared
            ? "“People reached” counts each phone once, however many times or cards it scanned; “Added to Wallet” counts phones by Apple's device id."
            : "“People reached” counts each physical card once, no matter how many times it was tapped."} Every link tap is
          counted by Campus Run before forwarding. Times in Pacific. Generated {fmtDate(today)} · campusrun.network
        </footer>
      </article>
    </main>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{children}</h2>;
}

function Big({ label, value, sub, gold }: { label: string; value: number; sub: string; gold?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${gold ? "bg-gold" : "bg-fill"}`}>
      <div className={`text-xs font-semibold ${gold ? "text-ink-deep" : "text-muted"}`}>{label}</div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className={`mt-0.5 text-xs ${gold ? "text-ink-deep/80" : "text-muted"}`}>{sub}</div>
    </div>
  );
}

function Row({ label, week, total, note, multiWeek }: { label: string; week: number; total: number; note: string; multiWeek: boolean }) {
  return (
    <tr className="border-t border-line">
      <td className="py-2.5 font-medium">{label}</td>
      {multiWeek && <td className="py-2.5 text-right">{week.toLocaleString()}</td>}
      <td className="py-2.5 text-right font-display text-lg font-bold">{total.toLocaleString()}</td>
      <td className="py-2.5 text-right text-xs text-muted">{note}</td>
    </tr>
  );
}

function Kv({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
