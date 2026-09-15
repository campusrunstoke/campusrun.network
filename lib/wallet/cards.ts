import { randomBytes } from "node:crypto";
import { siteUrl } from "@/lib/campaigns";

/**
 * Card ids are what KC encodes on the NFC chip / prints as the QR. They're
 * human-readable (prefix + sequence) so a printed batch can be sorted and handed
 * out in order, plus a short random suffix so nobody can guess a neighbour's card
 * and tap it from their couch: `pocari-0042-k7x3`.
 */
export function mintCardIds(prefix: string, count: number, startAt = 0): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const seq = String(startAt + i + 1).padStart(4, "0");
    const suffix = randomBytes(3).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x").slice(0, 4);
    ids.push(`${prefix}-${seq}-${suffix}`);
  }
  return ids;
}

/** The URL written to the card. */
export const cardUrl = (cardId: string, base: string = siteUrl()) =>
  `${base.replace(/\/+$/, "")}/c/${encodeURIComponent(cardId)}`;
