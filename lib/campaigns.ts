import type { Campaign } from "@/lib/db/schema";

/** Base URL used in generated NFC links (the pretty domain, even when viewed via vercel.app). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusrun.network").replace(/\/+$/, "");
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
