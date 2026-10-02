import { PKPass, PassType } from "passkit-generator";
import { walletConfig, walletConfigured, WalletNotConfiguredError } from "./config";
import { passAssets } from "./assets";
import { siteUrl } from "@/lib/campaigns";
import { SMS_DISCLOSURE } from "@/lib/sms";
import { featuredLinks } from "./featured";

// Labels and terms are typed in the designer, and Wallet renders attributedValue as HTML.
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
import type { Pass, WalletCampaign, WalletLink } from "@/lib/db/schema";
import type { LinkAction } from "./types";

/** A campaign link, plus the optional Apple Featured Action overrides. */
export type FeaturedLink = Pick<WalletLink, "action" | "label"> & {
  featuredType?: string | null;
  featuredDirect?: boolean | null;
  destination?: string | null;
};

/**
 * Builds a signed .pkpass buffer for one card's pass. Per-pass values (serial,
 * authenticationToken, webServiceURL) are injected here so a tap and a later
 * redemption resolve back to the same card (§4).
 *
 * This is a placeholder coupon template — real design/art/copy swap in from KC's
 * pass.json + assets without touching the tap→serve→register plumbing around it.
 */
const LINK_LABELS: Record<LinkAction, string> = {
  map: "WHERE TO BUY",
  website: "WEBSITE",
  video: "WATCH",
  shop: "SHOP",
  giveaway: "GIVEAWAY",
};

/**
 * Back-of-pass rows, shared by every style so the poster and its legacy fallback carry
 * identical content. Each link is a pass-through URL on our domain (§4): Wallet renders
 * the anchor as tappable, and we count the click before bouncing to the real destination.
 */
function buildBackFields(
  serial: string,
  base: string,
  terms: string | null,
  links: FeaturedLink[],
  cardId: string,
  linkUrl: (l: FeaturedLink) => string,
  preview: boolean,
) {
  const rows = links.map((l) => ({
    key: `link-${l.action}`,
    label: LINK_LABELS[l.action],
    value: linkUrl(l),
    attributedValue: `<a href="${linkUrl(l)}">${escapeHtml(l.label || LINK_LABELS[l.action])}</a>`,
  }));
  // The giveaway enters by text, so the pass carries the carrier-required SMS disclosure.
  if (links.some((l) => l.action === "giveaway")) {
    rows.push({ key: "sms", label: "TEXT TO ENTER", value: SMS_DISCLOSURE, attributedValue: SMS_DISCLOSURE });
  }
  if (terms) rows.push({ key: "terms", label: "TERMS", value: terms, attributedValue: escapeHtml(terms) });
  // A preview has no real pass behind it, so there is no receipt page to send people to.
  if (!preview) rows.push({
    key: "receipt",
    label: "BOUGHT IT?",
    value: `${base}/receipt/${serial}`,
    attributedValue: `<a href="${base}/receipt/${serial}">Tell us where you bought it</a>`,
  });
  rows.push({ key: "card", label: "CARD", value: cardId, attributedValue: cardId });
  return rows;
}

/**
 * `preview` builds a design-check pass for the designer's "send to my phone": no web
 * service (nothing registers, so no pass_added), and links go straight to their real
 * destinations (no click is logged) — a preview never touches a campaign's numbers.
 */
export async function buildPass(
  pass: Pick<Pass, "serial" | "cardId">,
  campaign: WalletCampaign,
  authToken: string | null,
  links: FeaturedLink[] = [],
  { preview = false }: { preview?: boolean } = {},
): Promise<Buffer> {
  if (!walletConfigured) throw new WalletNotConfiguredError();

  const passTypeIdentifier = campaign.passTypeIdentifier || walletConfig.passTypeIdentifier!;
  const base = siteUrl();
  const linkUrl = (l: FeaturedLink) =>
    (preview || l.featuredDirect) && l.destination ? l.destination : `${base}/r/${pass.serial}/${l.action}`;

  // Per-campaign artwork falls back to the Campus Run placeholders, so a campaign with
  // no design set still produces a valid, installable pass.
  const png = (b64: string | null) => (b64 ? Buffer.from(b64, "base64") : null);
  const logo = png(campaign.logoPng);
  const icon = png(campaign.iconPng);
  const strip = png(campaign.stripPng);
  const background = png(campaign.backgroundPng);
  const art: Record<string, Buffer> = { ...passAssets };
  if (icon) { art["icon.png"] = icon; art["icon@2x.png"] = icon; }
  if (logo) { art["logo.png"] = logo; art["logo@2x.png"] = logo; }
  if (strip) { art["strip.png"] = strip; art["strip@2x.png"] = strip; }
  if (background) {
    // Poster event tickets read artwork.png and render it crisp and full-bleed.
    // background.png is the legacy eventTicket asset, which iOS blurs and darkens —
    // supplying both means the poster style looks right and older layouts still work.
    art["background.png"] = background;
    art["background@2x.png"] = background;
    art["artwork.png"] = background;
    art["artwork@2x.png"] = background;
  }

  // Decide style before constructing: `semantics` is a constructor prop (pk.props is a
  // read-only getter), and Apple requires the full set or the poster layout falls back.
  const isPoster = campaign.passStyle === "poster";
  const pk = new PKPass(
    art,
    {
      wwdr: walletConfig.wwdr!,
      signerCert: walletConfig.signerCert!,
      signerKey: walletConfig.signerKey!,
      signerKeyPassphrase: walletConfig.signerKeyPassphrase,
    },
    {
      passTypeIdentifier,
      teamIdentifier: walletConfig.teamIdentifier!,
      organizationName: walletConfig.organizationName,
      description: `${campaign.brand} — ${campaign.name}`,
      serialNumber: pass.serial,
      // Per-pass secret Apple echoes back on every web-service call (register/get/unregister),
      // and the base for that web service (Apple appends /v1/…). Previews have neither.
      ...(preview || !authToken
        ? {}
        : { authenticationToken: authToken, webServiceURL: `${base}/api/wallet` }),
      foregroundColor: campaign.fgColor || "rgb(0, 59, 92)",
      backgroundColor: campaign.bgColor || "rgb(255, 255, 255)",
      labelColor: campaign.labelColor || "rgb(110, 110, 115)",
      ...(campaign.suppressHeaderDarkening ? { suppressHeaderDarkening: true } : {}),
    },
  );

  const ALIGN = {
    left: "PKTextAlignmentLeft",
    center: "PKTextAlignmentCenter",
    right: "PKTextAlignmentRight",
  } as const;
  const textAlignment = ALIGN[campaign.textAlign as keyof typeof ALIGN] ?? ALIGN.left;

  const header = { key: "brand", label: "", value: campaign.headerText || campaign.brand };
  const offer = {
    key: "offer",
    label: campaign.offerLabel || "COUPON",
    value: campaign.offerValue || "Your reward",
    textAlignment,
  };
  const where = {
    key: "where",
    label: campaign.secondaryLabel || "WHERE TO BUY",
    value: campaign.secondaryValue || "Tap for the map",
    textAlignment,
  };
  const backFields = buildBackFields(pass.serial, base, campaign.terms, links, pass.cardId, linkUrl, preview);

  if (isPoster) {
    // posterGeneric (iOS 27) is the full-bleed poster layout built for coupons and
    // memberships: crisp artwork, no event semantics to satisfy, it still allows a
    // barcode, and — the part that matters here — it supports Featured Actions, the
    // only way Apple gives us tappable buttons on the FRONT of a pass.
    const poster = new PassType("posterGeneric");
    if (!campaign.hideHeaderText) poster.headerFields.push(header);
    // One field per row. Two side by side in primaryFields is what crammed the offer
    // against the second line; the poster layout has a footer slot built for it.
    poster.primaryFields.push(offer);
    poster.footerFields.push(where);
    poster.backFields.push(...backFields);

    // Shipping a legacy style alongside it means pre-iOS-27 devices still get a usable
    // pass instead of nothing. Wallet prefers posterGeneric wherever it's supported.
    const legacy = new PassType("coupon");
    if (!campaign.hideHeaderText) legacy.headerFields.push(header);
    legacy.primaryFields.push(offer);
    legacy.secondaryFields.push(where);
    legacy.backFields.push(...backFields);

    pk.types.push(poster, legacy);

    // Up to two Featured Actions, rendered as cards under the pass. These are our
    // tracked pass-through URLs, so a front-of-pass tap is counted like any other click.
    // Which links qualify, and their Apple type, comes from lib/wallet/featured — the
    // same rule the designer previews. We choose the type; Apple writes the words.
    pk.featuredActions = featuredLinks(links).map(({ link, type }) => ({
      identifier: link.action,
      type: type as never,
      // Everything goes through our tracker so the tap is counted. Only a link
      // explicitly marked direct bypasses it, for action types that won't render
      // otherwise — that trade is opt-in, never the default.
      url: linkUrl(link),
    }));
  } else {
    pk.type = "coupon";
    if (!campaign.hideHeaderText) pk.headerFields.push(header);
    pk.primaryFields.push(offer);
    pk.secondaryFields.push(where);
    pk.backFields.push(...backFields);
  }
  // Store coordinates drive Apple's "place" Featured Action and the lock-screen
  // suggestion when someone is near the store. A map URL alone isn't enough — Wallet
  // silently drops a "place" button on a pass that has no location.
  if (campaign.placeLat && campaign.placeLon) {
    pk.setLocations({
      latitude: Number(campaign.placeLat),
      longitude: Number(campaign.placeLon),
      relevantText: campaign.placeLabel || campaign.secondaryValue || campaign.brand,
    });
  }

  // The barcode is the redeem URL for this exact pass: a cashier scans it with any phone
  // camera and lands on /redeem/{serial} (§5 option A). Giveaway campaigns switch it off
  // — flipping showBarcode back on restores the scan-to-redeem flow with no code change.
  if (campaign.showBarcode) {
    pk.setBarcodes({
      message: `${base}/redeem/${pass.serial}`,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
      altText: pass.cardId,
    });
  }

  return pk.getAsBuffer();
}
