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
          <h1 className="font-display text-xl font-bold text-white">Wallet campaigns</h1>
          <p className="mt-1 text-sm text-[#9AA6B8]">
            NFC tap → Apple Wallet pass → link clicks → store redemption. One row per activation.
          </p>
        </div>
      </div>

      {!walletConfigured && (
        <p className="mb-6 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/[0.06] px-4 py-3 text-xs text-[#E3C878]">
          Apple Wallet signing isn&apos;t configured yet — taps are tracked and the web coupon is
          served, but no .pkpass is issued. Set the WALLET_* environment variables once the Apple
          cert arrives.
        </p>
      )}

      <NewWalletCampaignForm />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm text-[#9AA6B8]">No wallet campaigns yet.</p>
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#6B7688]">
                <Th>Campaign</Th>
                <Th right>Cards</Th>
                <Th right>People</Th>
                <Th right>Passes</Th>
                <Th right>Clicked</Th>
                <Th right>Redeemed</Th>
                <Th right>→ Pass</Th>
                <Th right>→ Redeem</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ campaign, funnel, conv, cards }) => (
                <tr key={campaign.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/wallet/${campaign.id}`} className="block">
                      <div className="font-display text-sm font-semibold text-white">
                        {campaign.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#9AA6B8]">
                        <span className="text-[#7DE3FF]">{campaign.brand}</span>
                        {campaign.venue ? ` · ${campaign.venue}` : ""}
                        {!campaign.active && <span className="ml-2 text-[#6B7688]">· paused</span>}
                      </div>
                    </Link>
                  </td>
                  <Td>{cards}</Td>
                  <Td>{funnel.people}</Td>
                  <Td>{funnel.passesAdded}</Td>
                  <Td>{funnel.clickers}</Td>
                  <Td accent>{funnel.redemptions}</Td>
                  <Td muted>{conv.tapToPass}%</Td>
                  <Td muted>{conv.tapToRedemption}%</Td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/wallet/${campaign.id}`}
                      className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[#9AA6B8] hover:text-white"
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
        accent ? "font-semibold text-[#FFCC00]" : muted ? "text-[#6B7688]" : "text-[#E5E9F0]"
      }`}
    >
      {children}
    </td>
  );
}
