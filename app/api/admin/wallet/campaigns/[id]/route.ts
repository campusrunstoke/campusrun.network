import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { walletCampaigns, walletCards, walletStores } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { mintCardIds } from "@/lib/wallet/cards";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  active: z.boolean().optional(),
  // Mint more cards: { mintCards: { prefix, count } }
  mintCards: z
    .object({
      prefix: z.string().trim().toLowerCase().min(1).max(40).regex(/^[a-z0-9._-]+$/),
      count: z.coerce.number().int().min(1).max(5000),
    })
    .optional(),
  // Add a store for redemption option A: { addStore: { name, pin? } }
  addStore: z
    .object({
      name: z.string().trim().min(1).max(120),
      pin: z.string().trim().max(32).optional(),
    })
    .optional(),
  // Change or clear an existing store's PIN (empty string clears it).
  setStorePin: z
    .object({ storeId: z.string().uuid(), pin: z.string().trim().max(32) })
    .optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  const d = parsed.data;

  if (d.active !== undefined) {
    await db.update(walletCampaigns).set({ active: d.active }).where(eq(walletCampaigns.id, id));
  }

  if (d.mintCards) {
    const [{ existing }] = await db
      .select({ existing: sql<number>`count(*)::int` })
      .from(walletCards)
      .where(eq(walletCards.campaignId, id));
    const ids = mintCardIds(d.mintCards.prefix, d.mintCards.count, existing);
    await db.insert(walletCards).values(
      ids.map((cid) => ({ id: cid, campaignId: id, batchLabel: `batch-${new Date().toISOString().slice(0, 10)}` })),
    );
  }

  if (d.addStore) {
    await db.insert(walletStores).values({
      campaignId: id,
      name: d.addStore.name,
      pin: d.addStore.pin || null,
    });
  }

  if (d.setStorePin) {
    // Setting a new PIN also clears any legacy hash, so the readable one is authoritative.
    await db
      .update(walletStores)
      .set({ pin: d.setStorePin.pin || null, pinHash: null })
      .where(eq(walletStores.id, d.setStorePin.storeId));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  // Cascades: cards, links, passes, registrations, stores. Events keep campaign_id → null.
  await db.delete(walletCampaigns).where(eq(walletCampaigns.id, id));
  return NextResponse.json({ ok: true });
}
