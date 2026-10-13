import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { offerClaims, passes, walletCampaigns } from "@/lib/db/schema";
import { offerPageSchema, smsConsentText, type OfferPage } from "@/lib/offer";
import OfferForm from "./OfferForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campus Run" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * GET /offer/{serial} — the page a pass's button opens (through /r, so the tap is
 * counted first). Optional offer up top, then an optional question and a phone number
 * with a separate, unticked texts opt-in. "brand" style wears the pass: its colours and
 * its poster artwork. /offer/preview?campaign={id} renders it without a pass or saving.
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

  const [campaign] = await db
    .select({
      offerPage: walletCampaigns.offerPage,
      bgColor: walletCampaigns.bgColor,
      fgColor: walletCampaigns.fgColor,
      labelColor: walletCampaigns.labelColor,
      hasArt: sql<boolean>`(${walletCampaigns.backgroundPng} is not null or ${walletCampaigns.stripPng} is not null)`,
    })
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, campaignId))
    .limit(1);
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

  const form = (offer.question || offer.askPhone) && (
    <OfferForm
      serial={serial}
      preview={preview}
      question={offer.question}
      askPhone={offer.askPhone}
      consent={smsConsentText(offer)}
      buttonLabel={offer.buttonLabel}
      alreadyAnswered={Boolean(existing?.answer || existing?.phone)}
      brand={offer.style === "brand" ? { bg: campaign.bgColor || "#003b5c" } : null}
    />
  );

  if (offer.style === "brand") {
    const bg = campaign.bgColor || "rgb(0, 59, 92)";
    const fg = campaign.fgColor || "#ffffff";
    const label = campaign.labelColor || "rgba(255,255,255,.75)";
    return (
      <main
        className="min-h-dvh w-full"
        style={{
          color: fg,
          background: `linear-gradient(180deg, ${bg} 0%, ${bg} 55%, color-mix(in srgb, ${bg} 70%, black) 100%)`,
        }}
      >
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
          <header className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: fg }} />
            <span className="font-display text-[13px] font-bold tracking-[-0.01em]">Campus Run</span>
            {offer.eyebrow && (
              <span className="ml-auto truncate text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: label }}>
                {offer.eyebrow}
              </span>
            )}
            {preview && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Preview</span>}
          </header>

          <h1 className="mt-6 font-display text-[34px] font-bold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">{offer.headline}</h1>
          {offer.details && <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed" style={{ color: label }}>{offer.details}</p>}

          {campaign.hasArt && (
            <div className="relative mx-auto mt-6 w-full max-w-[270px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/offer/art/${campaignId}`}
                alt={`${offer.brandName}`}
                className="aspect-[1125/1560] w-full rounded-[26px] object-cover object-top shadow-[0_24px_60px_rgba(0,0,0,.45)] ring-1 ring-white/15"
              />
            </div>
          )}

          <Offer offer={offer} onBrand />

          <div className="mt-6">{form}</div>

          {offer.terms && <p className="mt-6 text-[12px] leading-relaxed" style={{ color: label }}>{offer.terms}</p>}

          <p className="mt-auto pt-8 text-center text-[12px] leading-relaxed" style={{ color: label }}>
            <a href="/terms" className="underline underline-offset-2">Terms</a> ·{" "}
            <a href="/privacy" className="underline underline-offset-2">Privacy</a> · Campus Run never sells your number.
          </p>
        </div>
      </main>
    );
  }

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

      <Offer offer={offer} />
      {form && <div className="mt-8">{form}</div>}

      {offer.terms && <p className="mt-8 text-xs leading-relaxed text-muted">{offer.terms}</p>}

      <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-muted">
        <a href="/terms" className="underline underline-offset-2">Terms</a> ·{" "}
        <a href="/privacy" className="underline underline-offset-2">Privacy</a> · Campus Run never sells your number.
      </p>
    </main>
  );
}

/** The giveaway-free offer block: a code and/or a button, when the page has one. */
function Offer({ offer, onBrand = false }: { offer: OfferPage; onBrand?: boolean }) {
  if (!offer.code && !offer.ctaUrl) return null;
  return (
    <div className={`mt-6 rounded-3xl p-6 text-center ${onBrand ? "bg-white text-ink" : "border-2 border-gold bg-fill"}`}>
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
  );
}
