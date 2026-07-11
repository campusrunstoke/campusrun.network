import type { Campaign } from "@/lib/db/schema";

/** Base URL used in generated NFC links (the pretty domain, even when viewed via vercel.app). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusrun.network").replace(/\/+$/, "");
}

/** The full capture-page link a client writes to an NFC card. */
export function campaignUrl(
  c: Pick<Campaign, "brand" | "eventId" | "cardNumber">,
  base: string = siteUrl(),
): string {
  const root = base.replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("e", c.eventId);
  params.set("b", c.brand);
  if (c.cardNumber) params.set("c", c.cardNumber);
  return `${root}/stoked?${params.toString()}`;
}
