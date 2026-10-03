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
    .select({
      action: walletLinks.action,
      label: walletLinks.label,
      featuredType: walletLinks.featuredType,
      featuredDirect: walletLinks.featuredDirect,
      destination: walletLinks.destination,
    })
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
 * Shared cards (a few cards on a table, many people): every phone gets its own pass.
 * The phone is recognised by the serial it was given before (a cookie set on its first
 * scan), so the same person scanning again — or scanning another card on the table —
 * keeps their one pass instead of being counted twice. That serial is only honoured if
 * it's a shared pass of this same campaign; anything else mints a fresh pass.
 */
export async function getOrCreateSharedPass(
  campaignId: string,
  cardId: string,
  rememberedSerial: string | null,
): Promise<{ serial: string; authToken: string | null; created: boolean }> {
  if (rememberedSerial && /^[0-9a-f]{32}$/.test(rememberedSerial)) {
    const [mine] = await db
      .select({ serial: passes.serial })
      .from(passes)
      .where(and(eq(passes.serial, rememberedSerial), eq(passes.campaignId, campaignId), eq(passes.shared, true)))
      .limit(1);
    if (mine) {
      return {
        serial: mine.serial,
        authToken: authTokenDerivable() ? passAuthToken(mine.serial) : null,
        created: false,
      };
    }
  }
  const serial = newSerial();
  const authToken = passAuthToken(serial);
  await db.insert(passes).values({ serial, cardId, campaignId, authTokenHash: hashToken(authToken), shared: true });
  return { serial, authToken, created: true };
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
