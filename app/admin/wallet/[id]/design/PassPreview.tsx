"use client";

import { featuredLinks, appleButtonLabel } from "@/lib/wallet/featured";
import type { DesignSave } from "@/lib/validation";

type Fields = DesignSave["fields"];
type LinkRow = DesignSave["links"][number];

/**
 * A close mock of how Wallet lays out the pass — Apple's text uses Apple's font and
 * Apple's positions, so this is a guide, not a guarantee. The real check is "Test on
 * my phone".
 */
export default function PassPreview({
  posterUrl,
  bannerUrl,
  logoUrl,
  brand,
  fields,
  links,
  wide = false,
}: {
  wide?: boolean;
  posterUrl: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  brand: string;
  fields: Fields;
  links: LinkRow[];
}) {
  const align = fields.textAlign;
  const header = fields.hideHeaderText ? null : fields.headerText || brand;
  const front = featuredLinks(links.map((l) => ({ ...l, featuredType: l.featuredType === "auto" ? null : l.featuredType })));
  const sys = { fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif" };


  return (
    <div className={`grid gap-6 ${wide ? "sm:grid-cols-2" : ""}`} style={sys}>
      {/* iOS 27 poster */}
      <div>
        <div className="mb-2 text-xs font-semibold text-ink">iOS 27 · poster</div>
        <div className="relative mx-auto aspect-[1125/1755] w-full max-w-[260px] overflow-hidden rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,.25)]" style={{ background: fields.bgColor, color: fields.fgColor }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {posterUrl && <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="relative flex h-full flex-col p-3">
            <div className="flex items-start justify-between gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={logoUrl} alt="" className="h-[30px] max-w-[60%] object-contain object-left" /> : <span className="text-xs font-bold">{brand}</span>}
              {header && <span className="truncate text-[11px] font-semibold">{header}</span>}
            </div>
            <div className="mt-auto" style={{ textAlign: align }}>
              <Label color={fields.labelColor}>{fields.offerLabel || "COUPON"}</Label>
              <div className="text-[20px] font-bold leading-tight">{fields.offerValue || "Your reward"}</div>
              <div className="mt-3">
                <Label color={fields.labelColor}>{fields.secondaryLabel || "WHERE TO BUY"}</Label>
                <div className="text-[12px]">{fields.secondaryValue || "Tap for the map"}</div>
              </div>
              {fields.showBarcode && <div className="mx-auto mt-3 h-14 w-14 rounded bg-white" />}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-[260px] space-y-1.5">
          {front.length === 0 ? (
            <p className="text-center text-[11px] text-muted">No front buttons</p>
          ) : (
            front.map(({ link, type }) => (
              <div key={link.action} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[12px] font-medium text-black shadow-sm">
                {appleButtonLabel(type) ?? type}
                <span className="text-muted">›</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* classic (older iPhones) */}
      <div>
        <div className="mb-2 text-xs font-semibold text-ink">Older iPhones · banner</div>
        <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[14px] shadow-[0_8px_30px_rgba(0,0,0,.25)]" style={{ background: fields.bgColor, color: fields.fgColor }}>
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoUrl ? <img src={logoUrl} alt="" className="h-[22px] max-w-[60%] object-contain object-left" /> : <span className="text-xs font-bold">{brand}</span>}
            {header && <span className="truncate text-[11px] font-semibold">{header}</span>}
          </div>
          <div className="relative aspect-[1125/432] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="relative flex h-full flex-col justify-center px-3" style={{ textAlign: align }}>
              <Label color={fields.labelColor}>{fields.offerLabel || "COUPON"}</Label>
              <div className="text-[18px] font-bold leading-tight">{fields.offerValue || "Your reward"}</div>
            </div>
          </div>
          <div className="px-3 py-2.5" style={{ textAlign: align }}>
            <Label color={fields.labelColor}>{fields.secondaryLabel || "WHERE TO BUY"}</Label>
            <div className="text-[12px]">{fields.secondaryValue || "Tap for the map"}</div>
          </div>
          {fields.showBarcode && <div className="mx-auto mb-3 h-14 w-14 rounded bg-white" />}
          <div className="pb-2 pr-3 text-right text-[12px] opacity-70">ⓘ</div>
        </div>
        <p className="mx-auto mt-2 max-w-[260px] text-center text-[11px] text-muted">
          No front buttons on older iPhones — links are on the back (tap ⓘ).
        </p>
      </div>
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color }}>{children}</div>;
}
