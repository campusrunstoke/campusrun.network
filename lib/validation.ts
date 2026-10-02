import { z } from "zod";

/** Empty string / whitespace / missing / non-string → null; otherwise trimmed string. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(max).nullable(),
  );

/** Empty / missing → null; otherwise a valid, lowercased email. */
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : null),
  z.string().trim().toLowerCase().email().max(254).nullable(),
);

/**
 * Body accepted by POST /api/submit.
 * Rating is the only required field. Attribution params are all optional.
 * `website` is a honeypot — real users never see or fill it; bots do.
 */
export const submissionSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  email: optionalEmail,
  e: optionalText(64),
  b: optionalText(64),
  c: optionalText(64),
  // Honeypot: real users never fill this (hidden). Handled in the route, not rejected here.
  website: z.string().max(200).optional().nullable(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

/** URL-safe slug for brand/event ids (what ends up in ?b= and ?e=). */
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9._-]+$/, "use letters, numbers, and - _ . only");

/** Body accepted by POST /api/admin/campaigns. */
export const campaignSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(["rating", "redirect"]).default("rating"),
    destinationUrl: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
      z
        .string()
        .url()
        .max(2048)
        .refine((u) => /^https?:\/\//i.test(u), "must start with http:// or https://")
        .nullable(),
    ),
    b: slug, // brand
    e: slug, // event / drop id
    c: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
      z.string().max(64).nullable(),
    ),
  })
  .refine((d) => d.type !== "redirect" || !!d.destinationUrl, {
    message: "A destination URL is required for a redirect campaign",
    path: ["destinationUrl"],
  });

export type CampaignInput = z.infer<typeof campaignSchema>;

/** Required, trimmed, length-capped free text. */
const requiredText = (max: number) => z.string().trim().min(1).max(max);

/**
 * Body accepted by POST /api/leads (the public "work with us" intake form).
 * Only company / name / email are required — an intake form that interrogates
 * people converts worse than one that lets them say the minimum and hit send.
 */
export const leadSchema = z.object({
  company: requiredText(160),
  contactName: requiredText(120),
  email: z.string().trim().toLowerCase().email().max(254),

  role: optionalText(120),
  phone: optionalText(40),
  website: optionalText(2048),
  interests: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20) : []),
    z.array(z.string().trim().max(80)),
  ),
  campuses: optionalText(500),
  timeline: optionalText(80),
  budget: optionalText(80),
  message: optionalText(5000),
  heardFrom: optionalText(200),

  // Honeypot — same trick as the capture page.
  website2: z.string().max(200).optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Body accepted by PATCH /api/admin/leads/[id]. */
export const leadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed"]),
});

/** Body accepted by POST /api/wallet/redeem (a coupon redemption, §5). */
export const redeemSchema = z.object({
  serial: z.string().trim().min(1).max(128),
  method: z.enum(["staff_scan", "receipt"]),
  storeId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().uuid().nullable(),
  ),
  storeName: optionalText(160),
  amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().max(100000).nullable(),
  ),
  pin: optionalText(32),
});

export type RedeemInput = z.infer<typeof redeemSchema>;

/** Body accepted by POST /api/admin/wallet/campaigns. */
export const walletCampaignSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  venue: optionalText(160),
  cardCount: z.coerce.number().int().min(0).max(5000).default(0),
  cardPrefix: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "use letters, numbers, and - _ . only"),
  links: z
    .array(
      z.object({
        action: z.enum(["map", "website", "video", "shop"]),
        label: optionalText(80),
        destination: z
          .string()
          .trim()
          .url()
          .max(2048)
          .refine((u) => /^https?:\/\//i.test(u), "must start with http:// or https://"),
      }),
    )
    .max(4)
    .default([]),
});

export type WalletCampaignInput = z.infer<typeof walletCampaignSchema>;

/* ------------------------------- pass designer ------------------------------- */

const num = z.number().finite();
const color = z.string().trim().max(40).regex(/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$/, "invalid color");
const layerBase = {
  id: z.string().max(40),
  x: num,
  y: num,
  opacity: z.number().min(0).max(1),
  hidden: z.boolean().optional(),
  name: z.string().max(80).optional(),
};
const layer = z.discriminatedUnion("type", [
  z.object({ ...layerBase, type: z.literal("image"), assetId: z.string().max(60), w: num.min(1), h: num.min(1) }),
  z.object({
    ...layerBase,
    type: z.literal("text"),
    text: z.string().max(400),
    font: z.string().max(80),
    size: num.min(4).max(1200),
    weight: z.number().int().min(100).max(900),
    color,
    align: z.enum(["left", "center", "right"]),
    lineHeight: num.min(0.5).max(3),
    letterSpacing: num.min(-50).max(200),
    glow: z.object({ color, blur: num.min(0).max(200) }).nullable(),
  }),
  z.object({ ...layerBase, type: z.literal("glow"), r: num.min(1).max(4000), inner: color, mid: color }),
]);
const fill = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color }),
  z.object({ type: z.literal("linear"), from: color, to: color, angle: num }),
]);
const artboard = z.object({ background: fill, layers: z.array(layer).max(60) });

export const designSchema = z.object({
  version: z.literal(1),
  poster: artboard,
  banner: artboard,
  logoAssetId: z.string().max(60).nullable(),
  fonts: z.array(z.object({ assetId: z.string().max(60), name: z.string().max(120) })).max(10),
});

/** Destinations a pass link may point at: web pages, or a pre-filled text (giveaways). */
const linkDestination = z
  .string()
  .trim()
  .max(2048)
  .refine((u) => /^(https?:\/\/[^\s]+|sms:[^\s]+)$/i.test(u), "must start with https://, http:// or sms:");

/** PUT /api/admin/wallet/campaigns/[id]/design — the designer's whole save. */
export const designSaveSchema = z.object({
  design: designSchema,
  fields: z.object({
    passStyle: z.enum(["poster", "coupon"]),
    headerText: optionalText(60),
    hideHeaderText: z.boolean(),
    offerLabel: optionalText(40),
    offerValue: optionalText(60),
    secondaryLabel: optionalText(40),
    secondaryValue: optionalText(60),
    terms: optionalText(600),
    textAlign: z.enum(["left", "center", "right"]),
    fgColor: color,
    bgColor: color,
    labelColor: color,
    suppressHeaderDarkening: z.boolean(),
    showBarcode: z.boolean(),
  }),
  links: z
    .array(
      z.object({
        action: z.enum(["map", "website", "video", "shop", "giveaway"]),
        label: optionalText(80),
        destination: linkDestination,
        featuredType: z.enum(["auto", "none", "viewOffersRewards", "order", "shop", "membershipBenefits"]),
      }),
    )
    .max(5)
    .refine((ls) => new Set(ls.map((l) => l.action)).size === ls.length, "each link type can only be used once"),
});

export type DesignSave = z.infer<typeof designSaveSchema>;
