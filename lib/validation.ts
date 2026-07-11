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
export const campaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  b: slug, // brand
  e: slug, // event / drop id
  c: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(64).nullable(),
  ),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
