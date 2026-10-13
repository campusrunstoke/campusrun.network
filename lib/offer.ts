import { z } from "zod";

/**
 * A campaign's offer page: what a student sees after tapping the pass's offer button.
 * Everyone who opens it gets the offer — no drawing, no winner — which is what keeps it
 * a plain promotion rather than a contest. The question and the phone number are both
 * optional and never required to see or use the offer.
 */
const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(max).nullable());

export const offerPageSchema = z.object({
  eyebrow: optional(60), // small line above the headline, e.g. "Pocari Sweat × Campus Run"
  headline: text(80).min(1), // "Here's $1 off Pocari Sweat"
  details: optional(400), // how to use it, where, until when
  code: optional(40), // a promo code to show and copy, if the offer has one
  ctaLabel: optional(40), // optional button, e.g. "Shop Pocari Sweat"
  ctaUrl: optional(500).refine((u) => !u || /^https:\/\//i.test(u), "must start with https://"),
  question: optional(200), // e.g. "Ever heard of Pocari Sweat?"
  askPhone: z.boolean(), // show the optional phone + texts opt-in
  brandName: text(60).min(1), // used in the consent wording
  terms: optional(500), // fine print under the offer
  // "brand": the page wears the pass — the campaign's colours, with its poster artwork as
  // the picture. "plain": Campus Run's white layout.
  style: z.enum(["plain", "brand"]).default("plain"),
  buttonLabel: optional(40), // the form's button, e.g. "Keep me posted"
});

export type OfferPage = z.infer<typeof offerPageSchema>;

export const defaultOfferPage = (brand: string): OfferPage => ({
  eyebrow: `${brand} × Campus Run`,
  headline: `Your ${brand} discount`,
  details: null,
  code: null,
  ctaLabel: null,
  ctaUrl: null,
  question: null,
  askPhone: true,
  brandName: brand,
  terms: null,
  style: "brand",
  buttonLabel: null,
});

/**
 * The texts consent shown beside the phone box: unticked by default, and — when the page
 * gives something away — never a condition of getting it. Takes the page so the stored
 * consent record is always the exact wording that page showed.
 */
export const smsConsentText = (page: Pick<OfferPage, "brandName" | "code" | "ctaUrl">) =>
  `Text me ${page.brandName} news and updates from Campus Run. Up to 4 msgs/month. Msg & data rates may apply. Reply STOP to opt out, HELP for help.${page.code || page.ctaUrl ? " Not required to get this offer." : ""}`;

/** US numbers only: "(310) 555-0101", "310.555.0101", "+1 310…" → "+13105550101". */
export function normalizeUsPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}
