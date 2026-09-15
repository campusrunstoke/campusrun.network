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
