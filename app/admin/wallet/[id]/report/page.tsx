import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { campaignFunnel, conversions, redemptionsByStore, deviceSplit, passInstallState } from "@/lib/wallet/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Weekly report · Campus Run" };

/**
 * Weekly client report (§6): one page KC can screenshot or print for the check-in —
 * this week vs cumulative, plus redemptions by store. Light, print-friendly, on-brand
 * (white / Ink / Gold) so it drops straight into a client deck.
 */
/** Request-time data for the report; kept outside the component so render stays pure. */
async function loadReport(id: string) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const [week, total, storesWeek, storesTotal, devices, installs] = await Promise.all([
    campaignFunnel(id, weekAgo),
    campaignFunnel(id),
    redemptionsByStore(id, weekAgo),
    redemptionsByStore(id),
    deviceSplit(id),
    passInstallState(id),
  ]);
  return { today, weekAgo, week, total, storesWeek, storesTotal, devices, installs };
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) notFound();

  const { today, weekAgo, week, total, storesWeek, storesTotal, devices, installs } = await loadReport(id);
  const cw = conversions(week);
  const ct = conversions(total);
  const taps = devices.reduce((s, d) => s + d.count, 0);
  const ios = devices.find((d) => d.device === "ios")?.count ?? 0;

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-ink print:px-0">
      <div className="flex items-start justify-between print:hidden">
        <Link href={`/admin/wallet/${id}`} className="text-xs text-muted hover:text-ink">← Back to campaign</Link>
        <span className="text-xs text-muted">Print / screenshot this page for the client check-in</span>
      </div>

      <header className="mt-6 border-b-2 border-ink pb-5">
        <div className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink">Campus Run</div>
        <h1 className="mt-2 font-display text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {campaign.brand}{campaign.venue ? ` · ${campaign.venue}` : ""} · Weekly report ·{" "}
          {fmtDate(weekAgo)} – {fmtDate(today)}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Funnel</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 font-medium">Step</th>
              <th className="py-2 text-right font-medium">This week</th>
              <th className="py-2 text-right font-medium">Cumulative</th>
              <th className="py-2 text-right font-medium">Conversion</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <Row label="People reached (unique taps)" week={week.people} total={total.people} conv={`${total.taps} taps incl. repeats`} />
            <Row label="Passes added to Wallet" week={week.passesAdded} total={total.passesAdded} conv={`${ct.tapToPass}% of people`} />
            <Row label="Clicked a link" week={week.clickers} total={total.clickers} conv={`${ct.tapToClick}% of people · ${total.clicks} clicks`} />
            <Row label="Redemptions" week={week.redemptions} total={total.redemptions} conv={`${ct.tapToRedemption}% of people`} gold />
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">
          This week: {cw.tapToPass}% added a pass · {cw.tapToRedemption}% redeemed.
        </p>
      </section>

      <section className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Redemptions by store</h2>
          {storesTotal.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No redemptions yet.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-1.5 font-medium">Store</th>
                  <th className="py-1.5 text-right font-medium">Week</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {storesTotal.map((s) => (
                  <tr key={s.store} className="border-t border-line">
                    <td className="py-1.5">{s.store}</td>
                    <td className="py-1.5 text-right">{storesWeek.find((w) => w.store === s.store)?.count ?? 0}</td>
                    <td className="py-1.5 text-right font-semibold">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Audience</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Kv k="Unique cards tapped" v={total.people} />
            <Kv k="iOS share of taps" v={taps ? `${Math.round((ios / taps) * 100)}%` : "—"} />
            <Kv k="Passes still in Wallet" v={installs.installed} />
            <Kv k="Passes removed" v={installs.removed} />
          </dl>
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
        Generated {fmtDate(today)} · campusrun.network
      </footer>
    </main>
  );
}

function Row({ label, week, total, conv, gold }: { label: string; week: number; total: number; conv?: string; gold?: boolean }) {
  return (
    <tr className="border-t border-line">
      <td className="py-2.5 font-medium">{label}</td>
      <td className="py-2.5 text-right">{week.toLocaleString()}</td>
      <td className={`py-2.5 text-right font-display text-lg font-bold ${gold ? "text-ink" : ""}`}>
        {gold ? <span className="rounded-lg bg-gold px-2 py-0.5 text-ink-deep">{total.toLocaleString()}</span> : total.toLocaleString()}
      </td>
      <td className="py-2.5 text-right text-xs text-muted">{conv ?? "—"}</td>
    </tr>
  );
}

function Kv({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-1.5">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
