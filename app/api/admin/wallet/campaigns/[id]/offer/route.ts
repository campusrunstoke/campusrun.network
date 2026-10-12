import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { offerPageSchema } from "@/lib/offer";

export const runtime = "nodejs";

/** Save (or with { offerPage: null }, remove) the campaign's offer page. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  let value = null;
  if (body?.offerPage !== null) {
    const parsed = offerPageSchema.safeParse(body?.offerPage);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return NextResponse.json({ ok: false, error: i ? `${i.path.join(".")}: ${i.message}` : "invalid" }, { status: 422 });
    }
    value = parsed.data;
  }
  const [row] = await db.update(walletCampaigns).set({ offerPage: value }).where(eq(walletCampaigns.id, id)).returning({ id: walletCampaigns.id });
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
