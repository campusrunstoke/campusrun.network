import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns } from "@/lib/db/schema";
import ReceiptForm from "./ReceiptForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "I bought it · Campus Run" };

/**
 * Receipt self-report (§5 option B) — the no-integration fallback for stores that
 * won't run the staff-scan flow. The student tells us where + how much; the event is
 * captured with method=receipt so the dashboard can separate it from staff-verified
 * redemptions. Photo upload / verification is the next enhancement on this page.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) notFound();
  const [campaign] = await db
    .select()
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, pass.campaignId))
    .limit(1);
  if (!campaign) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink">
        Campus Run
      </div>
      <div className="mt-8">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted">
          {campaign.brand}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink">
          Bought it? Tell us where.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">Takes ten seconds.</p>
      </div>
      <ReceiptForm serial={serial} alreadyRedeemed={Boolean(pass.redeemedAt)} />
    </main>
  );
}
