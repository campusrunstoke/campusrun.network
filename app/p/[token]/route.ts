import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";
import { verifyPreviewToken } from "@/lib/wallet/ids";
import { campaignLinks } from "@/lib/wallet/events";
import { buildPass } from "@/lib/wallet/pass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /p/{token} — a design-check pass from the designer's "test on my phone".
 * Built from the campaign's saved design, but with no web service and direct links,
 * so adding it, tapping its buttons and deleting it never show up in the analytics.
 * Each preview gets a fresh serial: Wallet treats it as a new pass, never a stale copy.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const campaignId = verifyPreviewToken(token);
  if (!campaignId) {
    return new NextResponse("This test link has expired. Make a new one from the designer.", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, campaignId)).limit(1);
  if (!campaign) return new NextResponse("Not found", { status: 404 });

  const links = await campaignLinks(campaignId);
  const serial = `preview-${randomBytes(6).toString("hex")}`;
  try {
    const buffer = await buildPass({ serial, cardId: "TEST PASS" }, campaign, null, links, { preview: true });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="preview.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[wallet] preview build failed:", err);
    return new NextResponse("Couldn't build the test pass.", { status: 500 });
  }
}
