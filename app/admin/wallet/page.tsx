import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { campaignHeadlines } from "@/lib/wallet/stats";
import { walletConfigured } from "@/lib/wallet/config";
import AdminShell from "../AdminShell";
import NewWalletCampaignForm from "./NewWalletCampaignForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet · Campus Run" };

/** Cross-campaign view (§6): every activation with its headline numbers, side by side. */
export default async function WalletPage() {
  const admin = await requireAdmin();
  const rows = await campaignHeadlines();

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">Campaigns</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            One row per brand activation. A student taps a card → gets the brand&apos;s Apple Wallet pass → taps its links
            (→ redeems in store, for coupons). Open a campaign to mint cards, watch results live, and pull the brand report.
          </p>
        </div>
      </div>

      {!walletConfigured && (
        <p className="mb-6 rounded-2xl border border-gold bg-gold/10 px-4 py-3 text-xs text-ink">
          Apple Wallet signing isn&apos;t configured yet — taps are tracked and the web coupon is
          served, but no .pkpass is issued. Set the WALLET_* environment variables once the Apple
          cert arrives.
        </p>
      )}

      <NewWalletCampaignForm />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <p className="text-sm text-muted">No wallet campaigns yet.</p>
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <Th>Campaign</Th>
                <Th right>Cards</Th>
                <Th right>People reached</Th>
                <Th right>Added to Wallet</Th>
                <Th right>Tapped a link</Th>
                <Th right>Redeemed</Th>
                <Th right>Tap → Wallet</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ campaign, funnel, conv, cards }) => (
                <tr key={campaign.id} className="border-t border-line first:border-t-0 hover:bg-fill">
                  <td className="px-4 py-3">
                    <Link href={`/admin/wallet/${campaign.id}`} className="block">
                      <div className="text-sm font-semibold text-ink">
                        {campaign.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        <span className="font-medium text-ink/80">{campaign.brand}</span>
                        {campaign.venue ? ` · ${campaign.venue}` : ""}
                        {!campaign.active && <span className="ml-2 rounded-full bg-line px-1.5 py-0.5 text-[10px] font-semibold text-muted">Paused</span>}
                      </div>
                    </Link>
                  </td>
                  <Td>{cards}</Td>
                  <Td>{funnel.people}</Td>
                  <Td>{funnel.passesAdded}</Td>
                  <Td>{funnel.clickers}</Td>
                  <Td accent>{funnel.redemptions}</Td>
                  <Td muted>{conv.tapToPass}%</Td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/wallet/${campaign.id}`}
                      className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink/70 hover:border-ink/30 hover:text-ink"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminShell>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 font-medium ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  accent,
  muted,
}: {
  children: React.ReactNode;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-right font-mono text-xs tabular-nums ${
        accent ? "text-ink" : muted ? "text-muted" : "text-ink"
      }`}
    >
      {children}
    </td>
  );
}
