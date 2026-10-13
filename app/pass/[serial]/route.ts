import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns } from "@/lib/db/schema";
import { authTokenDerivable, passAuthToken } from "@/lib/wallet/ids";
import { campaignLinks } from "@/lib/wallet/events";
import { buildPass } from "@/lib/wallet/pass";
import { walletConfigured } from "@/lib/wallet/config";
import { siteUrl } from "@/lib/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /pass/{serial} — the .pkpass for a pass that already exists. Used by the loading
 * page after a tap (the tap itself was logged by /c), and by its "Add to Apple Wallet"
 * retry button. Never logs a tap. Anything it can't sign falls back to the web pass.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ serial: string }> }) {
  const { serial } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(serial)) return new NextResponse("not found", { status: 404 });
  const webPass = NextResponse.redirect(`${siteUrl()}/coupon/${serial}`, { status: 307 });

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) return new NextResponse("not found", { status: 404 });
  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, pass.campaignId)).limit(1);
  if (!campaign?.active || !walletConfigured || !authTokenDerivable()) return webPass;

  try {
    const links = await campaignLinks(campaign.id);
    const buffer = await buildPass({ serial, cardId: pass.cardId }, campaign, passAuthToken(serial), links);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="campusrun-${pass.cardId}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[wallet] /pass build failed, serving web pass:", err);
    return webPass;
  }
}
