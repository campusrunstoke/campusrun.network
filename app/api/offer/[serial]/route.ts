import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { offerClaims, passes, walletCampaigns } from "@/lib/db/schema";
import { normalizeUsPhone, offerPageSchema, smsConsentText } from "@/lib/offer";

export const runtime = "nodejs";

const schema = z.object({
  answer: z.string().max(300).default(""),
  phone: z.string().max(40).default(""),
  smsOptIn: z.boolean().default(false),
});

/**
 * POST /api/offer/{serial} — the offer page's optional answer / phone / opt-in. Keyed to
 * the pass, so each person has one record; sending again updates it rather than adding
 * a second (no double counting). Unknown serials are refused.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ serial: string }> }) {
  const { serial } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(serial)) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Something was off — try again." }, { status: 422 });
  const answer = parsed.data.answer.trim().slice(0, 300) || null;
  const phone = parsed.data.phone.trim() ? normalizeUsPhone(parsed.data.phone) : null;
  if (parsed.data.phone.trim() && !phone) {
    return NextResponse.json({ ok: false, error: "That doesn't look like a US phone number." }, { status: 422 });
  }
  if (!answer && !phone) return NextResponse.json({ ok: false, error: "Nothing to send." }, { status: 422 });
  // Consent only counts with a number attached.
  const smsOptIn = Boolean(phone) && parsed.data.smsOptIn;

  const [pass] = await db.select({ campaignId: passes.campaignId, cardId: passes.cardId }).from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // The consent record is the wording this campaign's page showed, built here on the
  // server — never taken from the request — plus the time they agreed.
  const [campaign] = await db.select({ offerPage: walletCampaigns.offerPage }).from(walletCampaigns).where(eq(walletCampaigns.id, pass.campaignId)).limit(1);
  const page = offerPageSchema.safeParse(campaign?.offerPage);
  const consentText = smsOptIn && page.success ? smsConsentText(page.data.brandName) : null;
  const consentedAt = consentText ? new Date() : null;

  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;
  await db
    .insert(offerClaims)
    .values({ campaignId: pass.campaignId, passSerial: serial, cardId: pass.cardId, answer, phone, smsOptIn: Boolean(consentText), consentText, consentedAt, userAgent })
    .onConflictDoUpdate({
      target: [offerClaims.campaignId, offerClaims.passSerial],
      set: {
        answer: sql`coalesce(excluded.answer, ${offerClaims.answer})`,
        phone: sql`coalesce(excluded.phone, ${offerClaims.phone})`,
        smsOptIn: sql`${offerClaims.smsOptIn} or excluded.sms_opt_in`,
        consentText: sql`coalesce(excluded.consent_text, ${offerClaims.consentText})`,
        consentedAt: sql`coalesce(${offerClaims.consentedAt}, excluded.consented_at)`,
        updatedAt: new Date(),
      },
    });
  return NextResponse.json({ ok: true });
}
