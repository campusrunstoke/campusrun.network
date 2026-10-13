import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * GET /offer/art/{campaignId} — the campaign's poster artwork, for its branded offer
 * page. Public on purpose: it's the same image every student already has on the pass.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return new NextResponse("not found", { status: 404 });
  const [c] = await db
    .select({ poster: walletCampaigns.backgroundPng, banner: walletCampaigns.stripPng })
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, campaignId))
    .limit(1);
  const data = c?.poster ?? c?.banner;
  if (!data) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(data, "base64")), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}
