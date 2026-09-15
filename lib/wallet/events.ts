import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  passes,
  walletCampaigns,
  walletEvents,
  walletLinks,
  type NewWalletEvent,
} from "@/lib/db/schema";
import { newSerial, passAuthToken, hashToken, authTokenDerivable } from "./ids";

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

/** The pass-through links configured for a campaign (baked into the pass + coupon page). */
export async function campaignLinks(campaignId: string) {
  return db
    .select({ action: walletLinks.action, label: walletLinks.label })
    .from(walletLinks)
    .where(eq(walletLinks.campaignId, campaignId));
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
 * Idempotent per (campaign, card): the first tap mints the pass; later taps on the same
 * card return the existing one, so a double-tap never creates a second serial. The
 * authToken is derivable from the serial (HMAC) whenever WALLET_TOKEN_SECRET is set, so
 * a re-tap can re-sign the same pass; without the secret it's only available on mint.
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
  if (existing) {
    return {
      serial: existing.serial,
      authToken: authTokenDerivable() ? passAuthToken(existing.serial) : null,
      created: false,
    };
  }

  const serial = newSerial();
  const authToken = passAuthToken(serial);
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
    if (winner) {
      return {
        serial: winner.serial,
        authToken: authTokenDerivable() ? passAuthToken(winner.serial) : null,
        created: false,
      };
    }
    throw new Error("failed to create or find pass");
  }
}
