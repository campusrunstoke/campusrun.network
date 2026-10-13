import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletLinks } from "@/lib/db/schema";
import { offerPageSchema } from "@/lib/offer";
import PassLoader from "./PassLoader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your pass · Campus Run" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * GET /get/{serial} — what an iPhone sees right after tapping a card (when the campaign's
 * loading page is on): "your pass is loading", then Apple's Add sheet opens over it, then
 * "Added — open Wallet". The tap was already logged by /c before redirecting here.
 */
export default async function GetPassPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  if (!/^[0-9a-f]{32}$/.test(serial)) notFound();
  const [pass] = await db.select({ campaignId: passes.campaignId }).from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) notFound();
  const [c] = await db
    .select({ brand: walletCampaigns.brand, bg: walletCampaigns.bgColor, fg: walletCampaigns.fgColor, label: walletCampaigns.labelColor, offerPage: walletCampaigns.offerPage })
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, pass.campaignId))
    .limit(1);
  if (!c) notFound();
  const offer = offerPageSchema.safeParse(c.offerPage);
  // Send the follow-up button through the pass's own tracked link, so it counts as a tap.
  const links = await db.select({ action: walletLinks.action, destination: walletLinks.destination }).from(walletLinks).where(eq(walletLinks.campaignId, pass.campaignId));
  const offerLink = links.find((l) => l.destination.includes("/offer/{pass}"));

  return (
    <PassLoader
      serial={serial}
      brand={c.brand}
      colors={{ bg: c.bg || "rgb(0, 59, 92)", fg: c.fg || "#ffffff", label: c.label || "rgba(255,255,255,.75)" }}
      // After adding, point people at the brand's page (e.g. "Keep me posted") if there is one.
      next={offer.success && offerLink ? { href: `/r/${serial}/${offerLink.action}`, label: offer.data.buttonLabel || "Get updates" } : null}
    />
  );
}
