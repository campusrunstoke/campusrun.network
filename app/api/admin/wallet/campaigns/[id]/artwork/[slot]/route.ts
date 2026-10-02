import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { ARTBOARDS } from "@/lib/wallet/design";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; slot: string }> };
const SLOTS = ["poster", "banner", "logo"] as const;
type Slot = (typeof SLOTS)[number];
const COLUMN = { poster: "backgroundPng", banner: "stripPng", logo: "logoPng" } as const;
const MAX_BYTES = 4_000_000;

async function guard(ctx: Ctx) {
  if (!(await getCurrentAdmin())) return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  const { id, slot } = await ctx.params;
  if (!SLOTS.includes(slot as Slot)) return { error: NextResponse.json({ ok: false, error: "unknown slot" }, { status: 404 }) };
  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) return { error: NextResponse.json({ ok: false, error: "not found" }, { status: 404 }) };
  return { campaign, slot: slot as Slot };
}

/** The campaign's current artwork for a slot — what the pass is built from right now. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const data = g.campaign[COLUMN[g.slot]];
  if (!data) return new NextResponse("none", { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(data, "base64")), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}

/**
 * Replace a slot's artwork with the raw image in the body (the designer's export).
 * Normalised here so a pass is always built from correctly sized PNGs, whatever the
 * browser sent: poster/banner to their exact artboard size, the logo trimmed and fitted
 * into Apple's 480×150 logo box — and the notification icon derived from the logo.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const { campaign, slot } = g;

  const body = Buffer.from(await req.arrayBuffer());
  if (body.length === 0 || body.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "image missing or too large" }, { status: 413 });
  }

  try {
    if (slot === "logo") {
      const trimmed = await sharp(body).trim().toBuffer().catch(() => body); // trim fails on a blank image
      const logo = await sharp(trimmed)
        .resize({ width: 480, height: 150, fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer();
      const mark = await sharp(trimmed).resize({ width: 74, height: 74, fit: "inside" }).png().toBuffer();
      const icon = await sharp({
        create: { width: 87, height: 87, channels: 4, background: campaign.bgColor || "#003B5C" },
      })
        .composite([{ input: mark, gravity: "center" }])
        .png()
        .toBuffer();
      await db
        .update(walletCampaigns)
        .set({ logoPng: logo.toString("base64"), iconPng: icon.toString("base64") })
        .where(eq(walletCampaigns.id, campaign.id));
    } else {
      const { w, h } = ARTBOARDS[slot];
      const png = await sharp(body).resize(w, h, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
      await db
        .update(walletCampaigns)
        .set({ [COLUMN[slot]]: png.toString("base64") })
        .where(eq(walletCampaigns.id, campaign.id));
    }
  } catch {
    return NextResponse.json({ ok: false, error: "couldn't read that image" }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
