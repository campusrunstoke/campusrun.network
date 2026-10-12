import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offerClaims, passes, walletCampaigns } from "@/lib/db/schema";
import { offerPageSchema, smsConsentText } from "@/lib/offer";
import OfferForm from "./OfferForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your offer · Campus Run" };

/**
 * GET /offer/{serial} — the page a pass's offer button opens (through /r, so the tap is
 * counted first). Everyone sees the offer straight away; the question and the phone
 * opt-in sit below it and are optional. /offer/preview?campaign={id} shows the same page
 * for checking the design, without a pass and without saving anything.
 */
export default async function OfferPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { serial } = await params;
  const { campaign: previewCampaign } = await searchParams;
  const preview = serial === "preview";

  let campaignId: string | null = null;
  if (preview) {
    campaignId = previewCampaign && /^[0-9a-f-]{36}$/i.test(previewCampaign) ? previewCampaign : null;
  } else if (/^[0-9a-f]{32}$/.test(serial)) {
    const [pass] = await db.select({ campaignId: passes.campaignId }).from(passes).where(eq(passes.serial, serial)).limit(1);
    campaignId = pass?.campaignId ?? null;
  }
  if (!campaignId) notFound();

  const [campaign] = await db.select().from(walletCampaigns).where(eq(walletCampaigns.id, campaignId)).limit(1);
  const parsed = offerPageSchema.safeParse(campaign?.offerPage);
  if (!campaign || !parsed.success) notFound();
  const offer = parsed.data;

  const [existing] = preview
    ? []
    : await db
        .select({ answer: offerClaims.answer, phone: offerClaims.phone })
        .from(offerClaims)
        .where(and(eq(offerClaims.campaignId, campaignId), eq(offerClaims.passSerial, serial)))
        .limit(1);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="flex items-center gap-[9px]">
        <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink" />
        <span className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink">Campus Run</span>
        {preview && <span className="ml-auto rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Preview</span>}
      </div>

      <div className="mt-8">
        {offer.eyebrow && <div className="text-sm font-semibold uppercase tracking-wider text-muted">{offer.eyebrow}</div>}
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink">{offer.headline}</h1>
        {offer.details && <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted">{offer.details}</p>}
      </div>

      {/* The offer itself — shown to everyone, before and regardless of the form. */}
      {(offer.code || offer.ctaUrl) && (
        <div className="mt-8 rounded-3xl border-2 border-gold bg-fill p-6 text-center">
          {offer.code && (
            <>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your code</div>
              <div className="mt-3 select-all font-mono text-3xl font-bold tracking-widest text-ink">{offer.code}</div>
            </>
          )}
          {offer.ctaUrl && (
            <a
              href={offer.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex h-14 w-full items-center justify-center rounded-2xl bg-gold font-display text-lg font-bold text-ink-deep ${offer.code ? "mt-5" : ""}`}
            >
              {offer.ctaLabel || "Use it now"}
            </a>
          )}
        </div>
      )}

      {(offer.question || offer.askPhone) && (
        <OfferForm
          serial={serial}
          preview={preview}
          question={offer.question}
          askPhone={offer.askPhone}
          consent={smsConsentText(offer.brandName)}
          alreadyAnswered={Boolean(existing?.answer || existing?.phone)}
        />
      )}

      {offer.terms && <p className="mt-8 text-xs leading-relaxed text-muted">{offer.terms}</p>}

      <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-muted">
        <a href="/terms" className="underline underline-offset-2">Terms</a> ·{" "}
        <a href="/privacy" className="underline underline-offset-2">Privacy</a> · Campus Run never sells your number.
      </p>
    </main>
  );
}
