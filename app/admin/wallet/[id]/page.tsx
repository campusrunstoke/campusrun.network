import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns, walletCards, walletLinks, walletStores } from "@/lib/db/schema";
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
import { cardUrl } from "@/lib/wallet/cards";
import AdminShell from "../../AdminShell";
import TapsChart from "./TapsChart";
import CampaignTools from "./CampaignTools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet campaign · Campus Run" };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (d: Date) =>
  `${d.toISOString().slice(5, 10).replace("-", "/")} ${d.toISOString().slice(11, 16)}`;

export default async function WalletCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) notFound();

  const [funnel, devices, actions, stores, methods, byHour, byDow, installs, series, events, cards, links, storeRows] =
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
    ]);
  const conv = conversions(funnel);
  const totalTaps = devices.reduce((s, d) => s + d.count, 0);

  return (
    <AdminShell name={admin.name} role={admin.role}>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/wallet" className="text-xs text-[#6B7688] hover:text-white">
            ← Wallet campaigns
          </Link>
          <h1 className="mt-1 font-display text-xl font-bold text-white">{campaign.name}</h1>
          <p className="mt-1 text-sm text-[#9AA6B8]">
            <span className="text-[#7DE3FF]">{campaign.brand}</span>
            {campaign.venue ? ` · ${campaign.venue}` : ""}
            <span className={`ml-2 ${campaign.active ? "text-[#4ADE80]" : "text-[#6B7688]"}`}>
              ● {campaign.active ? "Active" : "Paused"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/wallet/${id}/report`}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-[#9AA6B8] hover:text-white"
          >
            Weekly report
          </Link>
          <a
            href={`/api/export?type=wallet&campaign=${id}`}
            className="rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 py-1.5 text-xs font-semibold text-[#FFCC00] hover:bg-[#FFCC00]/20"
          >
            ↓ Raw events CSV
          </a>
        </div>
      </div>

      {/* funnel — hero numbers with conversion between steps (§6) */}
      {/* every % is "of people reached" (distinct cards tapped) — one honest denominator */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People reached" value={funnel.people} sub={`${funnel.taps} taps incl. repeats`} />
        <Stat label="Passes added" value={funnel.passesAdded} sub={`${conv.tapToPass}% of people`} />
        <Stat label="Clicked a link" value={funnel.clickers} sub={`${conv.tapToClick}% of people · ${funnel.clicks} clicks`} />
        <Stat label="Redeemed" value={funnel.redemptions} sub={`${conv.tapToRedemption}% of people`} accent />
      </section>

      {/* taps over time (§6 "see the booth's peak") */}
      <Panel title="Taps per hour" hint="UTC">
        <TapsChart points={series.map((p) => ({ t: new Date(p.bucket).toISOString(), n: p.count }))} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="iOS vs Android" hint="taps">
          <Rows
            rows={[
              ["iOS", devices.find((d) => d.device === "ios")?.count ?? 0],
              ["Android", devices.find((d) => d.device === "android")?.count ?? 0],
              ["Other", devices.find((d) => d.device === "other")?.count ?? 0],
            ]}
            total={totalTaps}
          />
        </Panel>
        <Panel title="Clicks by link" hint="pass-through">
          <Rows rows={actions.map((a) => [a.action ?? "—", a.count])} total={funnel.clicks} empty="No clicks yet." />
        </Panel>
        <Panel title="Passes installed" hint="current state">
          <Rows
            rows={[
              ["Still in Wallet", installs.installed],
              ["Removed", installs.removed],
              ["Served, not yet added", installs.created],
              ["Redeemed", installs.redeemed],
            ]}
          />
        </Panel>
        <Panel title="Redemptions by store">
          <Rows
            rows={stores.map((s) => [s.store, s.count, s.amount ? `$${s.amount.toFixed(2)}` : undefined])}
            total={funnel.redemptions}
            empty="No redemptions yet."
          />
        </Panel>
        <Panel title="Redemptions by hour" hint="UTC">
          <Rows rows={byHour.map((h) => [`${String(h.hour).padStart(2, "0")}:00`, h.count])} empty="No redemptions yet." />
        </Panel>
        <Panel title="Redemptions by day">
          <Rows rows={byDow.map((d) => [DOW[d.dow] ?? String(d.dow), d.count])} empty="No redemptions yet." />
          {methods.length > 0 && (
            <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-[#6B7688]">
              by method:{" "}
              {methods.map((m) => `${m.method?.replace("_", " ")} ${m.count}`).join(" · ")}
            </div>
          )}
        </Panel>
      </div>

      {/* operations: cards, links, stores */}
      <CampaignTools
        campaignId={id}
        active={campaign.active}
        cards={cards.map((c) => ({ id: c.id, url: cardUrl(c.id), active: c.active }))}
        links={links.map((l) => ({ action: l.action, destination: l.destination }))}
        stores={storeRows.map((s) => ({ id: s.id, name: s.name, hasPin: Boolean(s.pinHash) }))}
      />

      {/* raw feed */}
      <Panel title="Recent events" hint={`last ${events.length}`} className="mt-6">
        {events.length === 0 ? (
          <p className="text-sm text-[#6B7688]">Nothing yet — tap a card.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-white/[0.06]">
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-[#6B7688]">{fmt(e.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badge(e.type)}`}>
                        {e.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-[#C3CBD9]">{e.cardId ?? "—"}</td>
                    <td className="py-2 pr-4 text-[#9AA6B8]">{e.deviceType ?? "—"}</td>
                    <td className="py-2 pr-4 text-[#9AA6B8]">
                      {e.type === "click" && e.action}
                      {e.type === "redemption" && `${e.storeName ?? "?"}${e.amount ? ` · $${e.amount}` : ""} · ${e.method}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}

function badge(type: string) {
  switch (type) {
    case "redemption": return "border-[#FFCC00]/30 bg-[#FFCC00]/10 text-[#FFCC00]";
    case "pass_added": return "border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#86EFAC]";
    case "pass_removed": return "border-white/10 bg-white/5 text-[#8A94A6]";
    case "click": return "border-[#A78BFA]/30 bg-[#A78BFA]/10 text-[#C4B5FD]";
    default: return "border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#7DE3FF]";
  }
}

function Stat({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B7688]">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent ? "text-[#FFCC00]" : "text-white"}`}>
        {value.toLocaleString()}
      </div>
      {sub && <div className="mt-1 text-xs text-[#6B7688]">{sub}</div>}
    </div>
  );
}

function Panel({ title, hint, children, className = "" }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold text-white">{title}</h2>
        {hint && <span className="font-mono text-[10px] text-[#6B7688]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Label / count / optional extra, with a proportional single-hue bar — magnitude, one hue. */
function Rows({ rows, total, empty }: { rows: [string, number, string?][]; total?: number; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const denom = total ?? rows.reduce((s, r) => s + r[1], 0);
  if (rows.length === 0 || rows.every((r) => r[1] === 0)) {
    return <p className="text-sm text-[#6B7688]">{empty ?? "—"}</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map(([label, n, extra]) => (
        <li key={label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[#C3CBD9]">{label}</span>
            <span className="font-mono tabular-nums text-[#E5E9F0]">
              {n.toLocaleString()}
              {extra && <span className="ml-2 text-[#6B7688]">{extra}</span>}
              {denom > 0 && <span className="ml-2 text-[#6B7688]">{Math.round((n / denom) * 100)}%</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-white/[0.06]">
            <div className="h-1.5 rounded-full bg-[#FFCC00]" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
