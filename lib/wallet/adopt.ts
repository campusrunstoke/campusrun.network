import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletAssets, walletCampaigns, type WalletCampaign } from "@/lib/db/schema";
import { ARTBOARDS, emptyDesign, newId, type Design } from "./design";

const hex = (c: string | null) => {
  const m = c?.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return m ? "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "#003B5C";
};

/**
 * Campaigns built before the designer existed (DAPS, the Pocari mockups) have shipped
 * artwork but no editable layers. Opening them in the designer must show that artwork —
 * a blank canvas there would overwrite the real pass on the next save. So on first open
 * we copy each existing image into an asset and save a design with it as a full-bleed
 * layer. One-time: once `design` is set this never runs again. The pass PNGs are untouched.
 */
export async function adoptExistingArtwork(campaign: WalletCampaign): Promise<Design | null> {
  const slots = [
    ["poster", campaign.backgroundPng],
    ["banner", campaign.stripPng],
    ["logo", campaign.logoPng],
  ] as const;
  if (!slots.some(([, data]) => data)) return null;

  const design = emptyDesign(hex(campaign.bgColor));
  for (const [slot, data] of slots) {
    if (!data) continue;
    const [asset] = await db
      .insert(walletAssets)
      .values({ campaignId: campaign.id, kind: "image", name: `Original ${slot}.png`, mime: "image/png", data })
      .returning({ id: walletAssets.id });
    if (slot === "logo") {
      design.logoAssetId = asset.id;
    } else {
      const { w, h } = ARTBOARDS[slot];
      design[slot].layers.push({ id: newId(), type: "image", assetId: asset.id, x: 0, y: 0, w, h, opacity: 1, name: `Original ${slot}` });
    }
  }

  // Only the first opener wins; a concurrent open just leaves a few unused asset rows.
  const [saved] = await db
    .update(walletCampaigns)
    .set({ design })
    .where(and(eq(walletCampaigns.id, campaign.id), isNull(walletCampaigns.design)))
    .returning({ design: walletCampaigns.design });
  if (saved) return design;
  const [current] = await db.select({ design: walletCampaigns.design }).from(walletCampaigns).where(eq(walletCampaigns.id, campaign.id));
  return (current?.design as Design) ?? design;
}
