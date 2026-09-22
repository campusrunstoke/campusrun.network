import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/campaigns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletLinks } from "@/lib/db/schema";
import type { LinkAction } from "@/lib/wallet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your coupon · Campus Run" };

const ACTION_META: Record<LinkAction, { label: string; icon: string }> = {
  map: { label: "Find a store", icon: "📍" },
  website: { label: "Visit the site", icon: "🌐" },
  video: { label: "Watch", icon: "▶︎" },
  shop: { label: "Shop now", icon: "🛍" },
};

/**
 * Web-coupon fallback (§4 Android note). Anyone who can't add an Apple pass lands here:
 * same coupon, same tracked links (each routes through /r/{serial}/{action}). Same
 * palette as the capture page — white, Ink text, Gold only on the primary action.
 */
export default async function CouponPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) notFound();

  const [campaign] = await db
    .select()
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, pass.campaignId))
    .limit(1);
  if (!campaign) notFound();

  const links = await db
    .select({ action: walletLinks.action, label: walletLinks.label, destination: walletLinks.destination })
    .from(walletLinks)
    .where(eq(walletLinks.campaignId, campaign.id));

  // The barcode IS the cashier's redeem link (§5A). The student carries it on their
  // screen; staff scan it with their own phone camera and land on the right coupon.
  const redeemQr = await QRCode.toDataURL(`${siteUrl()}/redeem/${serial}`, {
    margin: 1,
    width: 640,
    color: { dark: "#003B5C", light: "#FFFFFF" },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink">
        Campus Run
      </div>

      <div className="mt-8">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted">
          {campaign.brand}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink">
          Your coupon is ready.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Show this at the register, or tap a link below.
        </p>
      </div>

      {/* The coupon card. Gold border = the reward (the Gold Rule). */}
      <div className="mt-8 rounded-3xl border-2 border-gold bg-fill p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Coupon</div>
        <div className="mt-3 font-display text-2xl font-bold text-ink">{campaign.name}</div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={redeemQr}
          alt="Show this to the cashier"
          className="mx-auto mt-5 h-52 w-52 rounded-2xl bg-white p-2"
        />
        <p className="mt-3 text-sm font-medium text-ink">Show this to the cashier</p>

        <div className="mt-3 inline-block rounded-xl bg-white px-5 py-2.5 font-mono text-base font-bold tracking-widest text-ink">
          {serial.slice(0, 8).toUpperCase()}
        </div>
      </div>

      {links.length > 0 && (
        <div className="mt-8 flex flex-col gap-3">
          {links.map((l) => {
            const meta = ACTION_META[l.action as LinkAction];
            return (
              <a
                key={l.action}
                href={`/r/${serial}/${l.action}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-line bg-white px-5 py-4 text-base font-semibold text-ink transition-transform active:scale-[0.98]"
              >
                <span aria-hidden className="text-xl">{meta.icon}</span>
                {l.label || meta.label}
              </a>
            );
          })}
        </div>
      )}

      <a
        href={`/receipt/${serial}`}
        className="mt-6 text-center text-sm font-medium text-ink underline underline-offset-4"
      >
        Already bought it? Tell us where →
      </a>

      <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-muted">
        Campus Run · one tap, zero friction.
      </p>
    </main>
  );
}
