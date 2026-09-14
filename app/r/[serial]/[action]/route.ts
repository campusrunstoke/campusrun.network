import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletLinks } from "@/lib/db/schema";
import { logEvent } from "@/lib/wallet/events";
import { detectDevice } from "@/lib/wallet/ids";
import { LINK_ACTIONS, type LinkAction } from "@/lib/wallet/types";
import { siteUrl } from "@/lib/campaigns";

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

  const destination = link?.destination ?? fallback;
  const userAgent = req.headers.get("user-agent");

  after(() =>
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
