import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletStores } from "@/lib/db/schema";
import RedeemForm from "./RedeemForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redeem · Campus Run" };

/**
 * Staff redemption (§5 option A). A cashier scans the pass barcode → lands here with
 * the serial → picks their store (+ PIN if set) → confirms. Store identity is the
 * selection, so this page is what a store-specific QR poster at the register opens.
 */
export default async function RedeemPage({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { serial } = await params;
  const { store: presetStore } = await searchParams;

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) notFound();

  const [campaign] = await db
    .select()
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, pass.campaignId))
    .limit(1);
  if (!campaign) notFound();

  // Stores for this campaign, plus brand-wide stores (campaignId null).
  const stores = await db
    .select({ id: walletStores.id, name: walletStores.name, needsPin: walletStores.pinHash })
    .from(walletStores)
    .where(
      and(
        eq(walletStores.active, true),
        or(eq(walletStores.campaignId, campaign.id), isNull(walletStores.campaignId)),
      ),
    );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink">
        Campus Run · Redeem
      </div>

      <div className="mt-8">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted">
          {campaign.brand}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink">
          {campaign.name}
        </h1>
        <p className="mt-2 font-mono text-xs text-muted">
          Coupon {serial.slice(0, 8).toUpperCase()} · card {pass.cardId}
        </p>
      </div>

      <RedeemForm
        serial={serial}
        alreadyRedeemed={Boolean(pass.redeemedAt)}
        redeemedAt={pass.redeemedAt?.toISOString() ?? null}
        stores={stores.map((s) => ({ id: s.id, name: s.name, needsPin: Boolean(s.needsPin) }))}
        presetStoreId={presetStore ?? null}
      />
    </main>
  );
}
