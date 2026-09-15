import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCards, walletCampaigns } from "@/lib/db/schema";
import { detectDevice } from "@/lib/wallet/ids";
import { campaignLinks, getOrCreatePass, logEvent } from "@/lib/wallet/events";
import { buildPass } from "@/lib/wallet/pass";
import { walletConfigured } from "@/lib/wallet/config";
import { siteUrl } from "@/lib/campaigns";

// postgres.js + pass signing need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NFC tap / QR scan landing (§3). Logs the tap, mints the card's pass, then serves:
 *   • iOS + signing configured → the signed .pkpass (Add to Apple Wallet)
 *   • everything else          → the tracked web-coupon fallback (§4 Android note)
 *
 * The tap is logged via after() so a slow DB never delays the pass download, and the
 * pass is always served even if logging fails — a tap must never be lost.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await ctx.params;
  const userAgent = req.headers.get("user-agent");
  const deviceType = detectDevice(userAgent);

  // Resolve the campaign for this card. Unknown/inactive card → log the tap anyway
  // (null campaign) and bounce to the site so a mis-encoded card is never a dead end.
  const [card] = await db
    .select({ campaignId: walletCards.campaignId, active: walletCards.active })
    .from(walletCards)
    .where(eq(walletCards.id, cardId))
    .limit(1);

  if (!card || !card.active) {
    after(() =>
      logEvent({ type: "tap", cardId, deviceType, userAgent: userAgent?.slice(0, 512) ?? null }),
    );
    return NextResponse.redirect(siteUrl(), { status: 307 });
  }

  const [campaign] = await db
    .select()
    .from(walletCampaigns)
    .where(and(eq(walletCampaigns.id, card.campaignId), eq(walletCampaigns.active, true)))
    .limit(1);

  const campaignId = card.campaignId;

  // Mint (or reuse) the pass for this card. authToken is non-null only on first mint.
  const { serial, authToken } = await getOrCreatePass(campaignId, cardId);

  after(() =>
    logEvent({
      type: "tap",
      campaignId,
      cardId,
      passSerial: serial,
      deviceType,
      userAgent: userAgent?.slice(0, 512) ?? null,
    }),
  );

  const canServePkpass = deviceType === "ios" && walletConfigured && campaign;

  if (canServePkpass) {
    try {
      // With WALLET_TOKEN_SECRET set the token is derivable, so a re-tap re-signs the
      // same pass (double-taps still get the Wallet pass). Without it, only the first
      // tap can sign; later taps fall back to the web coupon — same tracking either way.
      if (!authToken) return webCoupon(serial);
      const links = await campaignLinks(campaignId);
      const buffer = await buildPass({ serial, cardId }, campaign, authToken, links);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Content-Disposition": `attachment; filename="campusrun-${cardId}.pkpass"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[wallet] pass build failed, serving web coupon:", err);
      return webCoupon(serial);
    }
  }

  return webCoupon(serial);
}

/** Redirect to the tracked web-coupon page (Android + any case we can't serve a .pkpass). */
function webCoupon(serial: string) {
  return NextResponse.redirect(`${siteUrl()}/coupon/${serial}`, { status: 307 });
}
