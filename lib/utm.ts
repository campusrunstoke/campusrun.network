import { randomBytes } from "node:crypto";

/**
 * Tap-time redirect decoration for /go: per-tap click IDs, UTM tagging,
 * and Vercel geo-header parsing. Pure functions — no DB, unit-testable.
 */

/** "cr_" + 12 base64url chars (72 bits) — same randomBytes idiom as lib/auth/session.ts. */
export function newClickId(): string {
  return "cr_" + randomBytes(9).toString("base64url");
}

export type TrackingParams = {
  brand: string;
  eventId: string;
  cardNumber: string | null;
  clickId: string;
};

/**
 * Append tracking params to a matched campaign's destination URL.
 * utm_* params already baked into the URL by the admin win; cr_cid is always ours.
 * A malformed destination degrades to today's behavior (returned untouched).
 */
export function withTracking(destination: string, t: TrackingParams): string {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;
  }
  const utm: Array<[string, string]> = [
    ["utm_source", "campusrun"],
    ["utm_medium", "nfc"],
    ["utm_campaign", `${t.brand}-${t.eventId}`],
  ];
  if (t.cardNumber) utm.push(["utm_content", `card-${t.cardNumber}`]);
  for (const [k, v] of utm) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  url.searchParams.set("cr_cid", t.clickId);
  return url.toString();
}

export type Geo = { city: string | null; region: string | null; country: string | null };

/**
 * Vercel edge geo headers — only populated in prod ("x-vercel-ip-city" is
 * URI-encoded, e.g. "S%C3%A3o%20Paulo"). Locally everything is null.
 */
export function geoFromHeaders(h: Headers): Geo {
  const raw = h.get("x-vercel-ip-city");
  let city = raw;
  if (raw) {
    try {
      city = decodeURIComponent(raw);
    } catch {
      city = raw; // malformed %-sequence — keep the raw value rather than throw
    }
  }
  return {
    city,
    region: h.get("x-vercel-ip-country-region"),
    country: h.get("x-vercel-ip-country"),
  };
}
