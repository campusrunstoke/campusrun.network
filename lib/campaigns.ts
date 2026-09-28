import type { Campaign } from "@/lib/db/schema";

/**
 * Base URL baked into generated NFC links, Wallet pass callbacks and QR codes.
 *
 * The default is the CANONICAL host (www). The bare domain 308-redirects to it, and
 * these URLs get burned onto physical cards and into Apple's webServiceURL — where a
 * redirect is at best a wasted round-trip on festival LTE and at worst a silently
 * dropped device callback. Never let this fall back to a redirecting host.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.campusrun.network").replace(/\/+$/, "");
}

/**
 * The link a client writes to an NFC card.
 * rating → /stoked (capture page). redirect → /go (log tap, bounce to their site).
 */
export function trackingUrl(
  c: Pick<Campaign, "type" | "brand" | "eventId" | "cardNumber">,
  base: string = siteUrl(),
): string {
  const root = base.replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("e", c.eventId);
  params.set("b", c.brand);
  if (c.cardNumber) params.set("c", c.cardNumber);
  const path = c.type === "redirect" ? "go" : "stoked";
  return `${root}/${path}?${params.toString()}`;
}

/** @deprecated use trackingUrl — kept for the rating-only unit test. */
export function campaignUrl(
  c: Pick<Campaign, "brand" | "eventId" | "cardNumber">,
  base: string = siteUrl(),
): string {
  return trackingUrl({ ...c, type: "rating" }, base);
}
