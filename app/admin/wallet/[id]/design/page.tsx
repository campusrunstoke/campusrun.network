import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns, walletCards, walletLinks } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { designSchema, type DesignSave } from "@/lib/validation";
import AdminShell from "../../../AdminShell";
import DesignStudio from "./DesignStudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pass designer · Campus Run" };

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) notFound();
  const [links, [cardCount]] = await Promise.all([
    db.select().from(walletLinks).where(eq(walletLinks.campaignId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(walletCards).where(eq(walletCards.campaignId, id)),
  ]);

  // A design saved by an older version (or hand-edited) that no longer validates opens
  // as a fresh canvas rather than crashing the editor; the shipped PNGs are untouched.
  const parsed = designSchema.safeParse(campaign.design);

  const fields: DesignSave["fields"] = {
    passStyle: campaign.passStyle === "poster" ? "poster" : "coupon",
    headerText: campaign.headerText,
    hideHeaderText: campaign.hideHeaderText,
    offerLabel: campaign.offerLabel,
    offerValue: campaign.offerValue,
    secondaryLabel: campaign.secondaryLabel,
    secondaryValue: campaign.secondaryValue,
    terms: campaign.terms,
    textAlign: (["left", "center", "right"].includes(campaign.textAlign) ? campaign.textAlign : "left") as "left" | "center" | "right",
    fgColor: campaign.fgColor || "rgb(255, 255, 255)",
    bgColor: campaign.bgColor || "rgb(0, 59, 92)",
    labelColor: campaign.labelColor || "rgb(200, 220, 235)",
    suppressHeaderDarkening: campaign.suppressHeaderDarkening,
    showBarcode: campaign.showBarcode,
  };

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <DesignStudio
        campaignId={id}
        brand={campaign.brand}
        name={campaign.name}
        initialDesign={parsed.success ? parsed.data : null}
        initialFields={fields}
        initialLinks={links.map((l) => ({
          action: l.action,
          label: l.label,
          destination: l.destination,
          featuredType: (l.featuredType ?? "auto") as DesignSave["links"][number]["featuredType"],
        }))}
        existing={{ poster: Boolean(campaign.backgroundPng), banner: Boolean(campaign.stripPng), logo: Boolean(campaign.logoPng) }}
        hasCards={cardCount.n > 0}
      />
    </AdminShell>
  );
}
