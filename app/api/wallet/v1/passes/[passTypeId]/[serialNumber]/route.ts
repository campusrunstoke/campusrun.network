import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";
import { authenticatePass } from "@/lib/wallet/apple-auth";
import { buildPass } from "@/lib/wallet/pass";
import { walletConfigured } from "@/lib/wallet/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ passTypeId: string; serialNumber: string }>;

/**
 * Return the latest version of a pass (Apple fetches this after a push, and to re-download).
 * GET /v1/passes/{passTypeId}/{serialNumber}
 *
 * The Authorization header carries the pass's own token, so we can both authenticate AND
 * re-sign with it (we never persist the plaintext token). This is what makes future push
 * updates possible without storing secrets.
 */
export async function GET(req: NextRequest, ctx: { params: Params }) {
  const { serialNumber } = await ctx.params;

  const authorization = req.headers.get("authorization");
  const pass = await authenticatePass(authorization, serialNumber);
  if (!pass) return new NextResponse(null, { status: 401 });
  if (!walletConfigured) return new NextResponse(null, { status: 501 });

  const token = /^ApplePass\s+(.+)$/i.exec(authorization!.trim())![1];

  const [campaign] = await db
    .select()
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, pass.campaignId))
    .limit(1);
  if (!campaign) return new NextResponse(null, { status: 404 });

  try {
    const buffer = await buildPass(pass, campaign, token);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": (pass.addedAt ?? pass.createdAt).toUTCString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[wallet] latest-pass build failed:", err);
    return new NextResponse(null, { status: 500 });
  }
}
