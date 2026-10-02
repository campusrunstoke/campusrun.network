import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { walletCampaigns, walletLinks } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { designSaveSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Save the designer: the editable layers, every pass field, and the links — in one
 * transaction, so a pass can never be built from half a save. The exported artwork
 * images are uploaded separately (PUT …/artwork/[slot]) because they're large.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = designSaveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "invalid" },
      { status: 422 },
    );
  }
  const { design, fields, links } = parsed.data;

  const found = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(walletCampaigns)
      .set({ ...fields, design })
      .where(eq(walletCampaigns.id, id))
      .returning({ id: walletCampaigns.id });
    if (!updated) return false;
    await tx.delete(walletLinks).where(eq(walletLinks.campaignId, id));
    if (links.length) {
      await tx.insert(walletLinks).values(
        links.map((l) => ({
          campaignId: id,
          action: l.action,
          label: l.label,
          destination: l.destination,
          featuredType: l.featuredType === "auto" ? null : l.featuredType,
        })),
      );
    }
    return true;
  });
  if (!found) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
