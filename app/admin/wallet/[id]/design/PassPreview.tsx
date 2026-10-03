"use client";

import { featuredLinks, appleButtonLabel } from "@/lib/wallet/featured";
import type { DesignSave } from "@/lib/validation";

type Fields = DesignSave["fields"];
type LinkRow = DesignSave["links"][number];

/**
 * A close mock of how Wallet lays out the pass — Apple's text uses Apple's font and
 * Apple's positions, so this is a guide, not a guarantee. The real check is "Test on
 * my phone".
 *
 * Every size is in container units (cqw = 1% of the pass's own width), measured from a
 * 260px-wide reference, so the mock keeps its real proportions at any preview width
 * instead of crowding when the sidebar is narrow.
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
        <div className="@container relative mx-auto aspect-[1125/1755] w-full max-w-[300px] overflow-hidden rounded-[7cqw] shadow-[0_8px_30px_rgba(0,0,0,.25)]" style={{ background: fields.bgColor, color: fields.fgColor }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {posterUrl && <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="relative flex h-full flex-col p-[4.6cqw]">
            <div className="flex items-start justify-between gap-[3cqw]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={logoUrl} alt="" className="h-[11.5cqw] max-w-[60%] object-contain object-left" /> : <span className="text-[4.6cqw] font-bold">{brand}</span>}
              {header && <span className="truncate text-[4.2cqw] font-semibold">{header}</span>}
            </div>
            <div className="mt-auto" style={{ textAlign: align }}>
              <Label color={fields.labelColor}>{fields.offerLabel || "COUPON"}</Label>
              <div className="text-[7.7cqw] font-bold leading-tight">{fields.offerValue || "Your reward"}</div>
              <div className="mt-[4.6cqw]">
                <Label color={fields.labelColor}>{fields.secondaryLabel || "WHERE TO BUY"}</Label>
                <div className="text-[4.6cqw]">{fields.secondaryValue || "Tap for the map"}</div>
              </div>
              {fields.showBarcode && <div className="mx-auto mt-[4.6cqw] h-[21.5cqw] w-[21.5cqw] rounded bg-white" />}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-[300px] space-y-1.5">
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

      {/* classic (older iPhones) — proportions measured from the real DAPS pass on device:
          tall coupon with perforated edges, large logo, big text in a light weight on the
          banner with its label BELOW it (in the text colour), footer on the plain background. */}
      <div>
        <div className="mb-2 text-xs font-semibold text-ink">Older iPhones · banner</div>
        <div className="@container mx-auto w-full max-w-[300px] drop-shadow-[0_8px_20px_rgba(0,0,0,.25)]">
          <Perforation color={fields.bgColor} flip />
          <div className="relative aspect-[836/1120] w-full overflow-hidden" style={{ background: fields.bgColor, color: fields.fgColor }}>
            <div className="absolute inset-x-0 top-0 flex h-[13%] items-start justify-between gap-2 px-[8.5%] pt-[1%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={logoUrl} alt="" className="h-[82%] max-w-[65%] object-contain object-left-top" /> : <span className="text-[4.6cqw] font-bold">{brand}</span>}
              {header && <span className="mt-[1.5cqw] truncate text-[4.2cqw] font-medium">{header}</span>}
            </div>
            <div className="absolute inset-x-0 top-[12.9%] aspect-[1125/432]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="relative pl-[9%] pr-[1%] pt-[3%]" style={{ textAlign: align }}>
                {/* Apple shrinks this line to fit rather than cutting it off; approximate that. */}
                <div className="whitespace-nowrap font-light leading-tight tracking-[-0.01em]" style={{ fontSize: fitSize(fields.offerValue || "Your reward") }}>
                  {fields.offerValue || "Your reward"}
                </div>
                <div className="mt-[10%] truncate text-[4.4cqw] font-normal">{fields.offerLabel || "COUPON"}</div>
              </div>
            </div>
            <div className="absolute inset-x-0 top-[43%] px-[9%]" style={{ textAlign: align }}>
              <div className="text-[3.3cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: fields.labelColor }}>{fields.secondaryLabel || "WHERE TO BUY"}</div>
              <div className="text-[5.2cqw] font-normal leading-tight">{fields.secondaryValue || "Tap for the map"}</div>
            </div>
            {fields.showBarcode && <div className="absolute bottom-[6%] left-1/2 h-[24.6cqw] w-[24.6cqw] -translate-x-1/2 rounded bg-white" />}
          </div>
          <Perforation color={fields.bgColor} />
        </div>
        <p className="mx-auto mt-2 max-w-[300px] text-center text-[11px] text-muted">
          No front buttons on older iPhones — links are on the back of the pass.
        </p>
      </div>
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return <div className="text-[3.5cqw] font-semibold uppercase tracking-wide" style={{ color }}>{children}</div>;
}

/** The coupon's perforated (zigzag) edge, top or bottom. */
function Perforation({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <div
      className="h-[4px] w-full"
      style={{
        background: `linear-gradient(135deg, ${color} 33%, transparent 33%) 0 0 / 6px 4px repeat-x, linear-gradient(225deg, ${color} 33%, transparent 33%) 0 0 / 6px 4px repeat-x`,
        transform: flip ? undefined : "scaleY(-1)",
      }}
    />
  );
}

/** Older-iPhone big text: ~8cqw, shrinking so long lines still fit on one line. */
const fitSize = (text: string) => `${Math.max(4.2, Math.min(8.1, 89 / (text.length * 0.47))).toFixed(2)}cqw`;
