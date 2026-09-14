import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletEvents, type NewWalletEvent } from "@/lib/db/schema";
import { newSerial, newAuthToken, hashToken } from "./ids";

/**
 * Append one row to the funnel log. Never throws to the caller's critical path —
 * a logging failure must never cost us the pass download or the redirect. Callers
 * fire this through `after()` so it can't slow the response either.
 */
export async function logEvent(event: NewWalletEvent): Promise<void> {
  try {
    await db.insert(walletEvents).values(event);
  } catch (err) {
    console.error("[wallet] logEvent failed:", err);
  }
}

/** The active campaign that owns a card. For v1 the card→campaign map is the campaign's brand context. */
export async function activeCampaign(campaignId: string) {
  const [c] = await db
    .select()
    .from(walletCampaigns)
    .where(and(eq(walletCampaigns.id, campaignId), eq(walletCampaigns.active, true)))
    .limit(1);
  return c ?? null;
}

/**
 * Idempotent per (campaign, card): the first tap mints the pass (serial + auth token);
 * later taps on the same card return the existing pass so a double-tap never creates a
 * second serial. Returns the plaintext authToken ONLY when freshly created (needed to
 * sign the pass); on reuse it's null because we only ever store the hash.
 */
export async function getOrCreatePass(
  campaignId: string,
  cardId: string,
): Promise<{ serial: string; authToken: string | null; created: boolean }> {
  const [existing] = await db
    .select()
    .from(passes)
    .where(and(eq(passes.campaignId, campaignId), eq(passes.cardId, cardId)))
    .limit(1);
  if (existing) return { serial: existing.serial, authToken: null, created: false };

  const serial = newSerial();
  const authToken = newAuthToken();
  try {
    await db.insert(passes).values({
      serial,
      cardId,
      campaignId,
      authTokenHash: hashToken(authToken),
    });
    return { serial, authToken, created: true };
  } catch {
    // Lost a race with a concurrent first tap — fetch the winner.
    const [winner] = await db
      .select()
      .from(passes)
      .where(and(eq(passes.campaignId, campaignId), eq(passes.cardId, cardId)))
      .limit(1);
    if (winner) return { serial: winner.serial, authToken: null, created: false };
    throw new Error("failed to create or find pass");
  }
}
