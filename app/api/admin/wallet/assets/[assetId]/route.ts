import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletAssets } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;

/** Serve a designer asset to the editor (admins only — brand files aren't public). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ assetId: string }> }) {
  if (!(await getCurrentAdmin())) return new NextResponse("unauthorized", { status: 401 });
  const { assetId } = await ctx.params;
  if (!UUID.test(assetId)) return new NextResponse("not found", { status: 404 });

  const [asset] = await db.select().from(walletAssets).where(eq(walletAssets.id, assetId)).limit(1);
  if (!asset) return new NextResponse("not found", { status: 404 });

  return new NextResponse(new Uint8Array(Buffer.from(asset.data, "base64")), {
    headers: {
      "Content-Type": asset.mime,
      // Assets never change once uploaded (edits upload a new one), so cache hard — privately.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
