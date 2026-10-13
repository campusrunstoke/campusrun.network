import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletLinks } from "@/lib/db/schema";
import { logEvent } from "@/lib/wallet/events";
import { detectDevice, isBot } from "@/lib/wallet/ids";
import { LINK_ACTIONS, type LinkAction } from "@/lib/wallet/types";
import { siteUrl } from "@/lib/campaigns";
import { withEntryCode } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ serial: string; action: string }>;

/**
 * Pass-through link (§4): every link on the pass points here. We log the click, then
 * 302 to the destination — which is looked up server-side per (campaign, action) and is
 * NEVER taken from the URL, so this can't be turned into an open redirect.
 * GET /r/{serial}/{action}
 */
export async function GET(req: NextRequest, ctx: { params: Params }) {
  const { serial, action } = await ctx.params;
  const fallback = siteUrl();

  if (!LINK_ACTIONS.includes(action as LinkAction)) {
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) return NextResponse.redirect(fallback, { status: 302 });

  const [link] = await db
    .select({ destination: walletLinks.destination })
    .from(walletLinks)
    .where(and(eq(walletLinks.campaignId, pass.campaignId), eq(walletLinks.action, action as LinkAction)))
    .limit(1);

  // A text-to-enter link carries this pass's entry code ("POCARI #7A2F9C"), so the entry
  // that comes back by text is tied to this exact pass, card and campaign.
  // "{pass}" marks our own per-pass pages (e.g. /offer/{pass}): fill in this pass.
  const destination = link?.destination ? withEntryCode(link.destination.replaceAll("{pass}", serial), serial) : fallback;
  const userAgent = req.headers.get("user-agent");

  // Link-preview robots still get forwarded (so previews work) but are never counted.
  if (!isBot(userAgent)) after(() =>
    logEvent({
      type: "click",
      campaignId: pass.campaignId,
      cardId: pass.cardId,
      passSerial: serial,
      action: action as LinkAction,
      destination,
      deviceType: detectDevice(userAgent),
      userAgent: userAgent?.slice(0, 512) ?? null,
    }),
  );

  return NextResponse.redirect(destination, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
