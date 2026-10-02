import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { walletAssets, walletCampaigns } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];
const FONT_EXT = /\.(otf|ttf|woff2?)$/i;
const MAX_BYTES = { image: 3_000_000, font: 2_000_000 };

const bodySchema = z.union([
  z.object({
    kind: z.enum(["image", "font"]),
    name: z.string().trim().max(120),
    mime: z.string().trim().max(80),
    data: z.string().max(4_200_000), // base64
  }),
  // Turn the campaign's current artwork into an editable layer (campaigns designed
  // before the designer existed, like hand-built ones).
  z.object({ fromSlot: z.enum(["poster", "banner", "logo"]) }),
]);

const SLOT_COLUMN = { poster: "backgroundPng", banner: "stripPng", logo: "logoPng" } as const;

/** Upload a designer asset (image or font) for this campaign. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 422 });
  }
  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, id)).limit(1);
  if (!campaign) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  let row: { kind: string; name: string; mime: string; data: string };
  if ("fromSlot" in parsed.data) {
    const data = campaign[SLOT_COLUMN[parsed.data.fromSlot]];
    if (!data) return NextResponse.json({ ok: false, error: "no artwork in that slot" }, { status: 404 });
    row = { kind: "image", name: `current ${parsed.data.fromSlot}.png`, mime: "image/png", data };
  } else {
    const { kind, name, mime, data } = parsed.data;
    if (kind === "image" && !IMAGE_MIME.includes(mime)) {
      return NextResponse.json({ ok: false, error: "images must be PNG, JPEG or WebP" }, { status: 422 });
    }
    if (kind === "font" && !FONT_EXT.test(name)) {
      return NextResponse.json({ ok: false, error: "fonts must be .otf, .ttf, .woff or .woff2" }, { status: 422 });
    }
    const bytes = Buffer.from(data, "base64").length;
    if (bytes === 0 || bytes > MAX_BYTES[kind]) {
      return NextResponse.json({ ok: false, error: `file too large (max ${MAX_BYTES[kind] / 1e6}MB)` }, { status: 413 });
    }
    row = { kind, name, mime: kind === "font" ? "font/" + name.split(".").pop()!.toLowerCase() : mime, data };
  }

  const [asset] = await db
    .insert(walletAssets)
    .values({ campaignId: id, ...row })
    .returning({ id: walletAssets.id, kind: walletAssets.kind, name: walletAssets.name, mime: walletAssets.mime });
  return NextResponse.json({ ok: true, asset });
}
