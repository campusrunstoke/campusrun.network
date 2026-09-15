import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { walletCampaigns, walletCards, walletLinks } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { walletCampaignSchema } from "@/lib/validation";
import { mintCardIds } from "@/lib/wallet/cards";

export const runtime = "nodejs";

/** Create a wallet campaign, mint its first batch of card ids, and set its pass links. */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const parsed = walletCampaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const [campaign] = await db
    .insert(walletCampaigns)
    .values({ brand: d.brand, name: d.name, venue: d.venue, createdBy: admin.id })
    .returning();

  if (d.links.length) {
    await db.insert(walletLinks).values(
      d.links.map((l) => ({
        campaignId: campaign.id,
        action: l.action,
        label: l.label,
        destination: l.destination,
      })),
    );
  }

  if (d.cardCount > 0) {
    const ids = mintCardIds(d.cardPrefix, d.cardCount, 0);
    await db.insert(walletCards).values(
      ids.map((id) => ({ id, campaignId: campaign.id, batchLabel: "initial" })),
    );
  }

  return NextResponse.json({ ok: true, id: campaign.id });
}
