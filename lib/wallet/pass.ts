import { PKPass, PassType } from "passkit-generator";
import { walletConfig, walletConfigured, WalletNotConfiguredError } from "./config";
import { passAssets } from "./assets";
import { siteUrl } from "@/lib/campaigns";
import type { Pass, WalletCampaign, WalletLink } from "@/lib/db/schema";
import type { LinkAction } from "./types";

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
  links: Pick<WalletLink, "action" | "label">[],
  cardId: string,
) {
  const rows = links.map((l) => ({
    key: `link-${l.action}`,
    label: LINK_LABELS[l.action],
    value: `${base}/r/${serial}/${l.action}`,
    attributedValue: `<a href="${base}/r/${serial}/${l.action}">${l.label || LINK_LABELS[l.action]}</a>`,
  }));
  if (terms) rows.push({ key: "terms", label: "TERMS", value: terms, attributedValue: terms });
  rows.push({
    key: "receipt",
    label: "BOUGHT IT?",
    value: `${base}/receipt/${serial}`,
    attributedValue: `<a href="${base}/receipt/${serial}">Tell us where you bought it</a>`,
  });
  rows.push({ key: "card", label: "CARD", value: cardId, attributedValue: cardId });
  return rows;
}

export async function buildPass(
  pass: Pick<Pass, "serial" | "cardId">,
  campaign: WalletCampaign,
  authToken: string,
  links: Pick<WalletLink, "action" | "label">[] = [],
): Promise<Buffer> {
  if (!walletConfigured) throw new WalletNotConfiguredError();

  const passTypeIdentifier = campaign.passTypeIdentifier || walletConfig.passTypeIdentifier!;
  const base = siteUrl();

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
  const starts = campaign.eventStartsAt ?? new Date();
  const ends = campaign.eventEndsAt ?? new Date(starts.getTime() + 6 * 3600 * 1000);
  const posterSemantics = {
    eventType: "PKEventTypeGeneric" as const,
    eventName: campaign.name,
    venueName: campaign.venue || campaign.brand,
    venueRegionName: campaign.venueRegion || "Los Angeles",
    venueRoom: campaign.venueRoom || campaign.venue || campaign.brand,
    eventStartDate: starts.toISOString(),
    eventEndDate: ends.toISOString(),
  };

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
      // Per-pass secret Apple echoes back on every web-service call (register/get/unregister).
      authenticationToken: authToken,
      // Base for the Apple PassKit web service. Apple appends /v1/… to this.
      webServiceURL: `${base}/api/wallet`,
      foregroundColor: campaign.fgColor || "rgb(0, 59, 92)",
      backgroundColor: campaign.bgColor || "rgb(255, 255, 255)",
      labelColor: campaign.labelColor || "rgb(110, 110, 115)",
      ...(isPoster ? { semantics: posterSemantics } : {}),
    },
  );

  const header = { key: "brand", label: "", value: campaign.headerText || campaign.brand };
  const offer = {
    key: "offer",
    label: campaign.offerLabel || "COUPON",
    value: campaign.offerValue || "Your reward",
  };
  const where = {
    key: "where",
    label: campaign.secondaryLabel || "WHERE TO BUY",
    value: campaign.secondaryValue || "Tap for the map",
  };
  const backFields = buildBackFields(pass.serial, base, campaign.terms, links, pass.cardId);

  if (isPoster) {
    // posterGeneric (iOS 27) is the full-bleed poster layout built for coupons and
    // memberships: crisp artwork, no event semantics to satisfy, it still allows a
    // barcode, and — the part that matters here — it supports Featured Actions, the
    // only way Apple gives us tappable buttons on the FRONT of a pass.
    const poster = new PassType("posterGeneric");
    poster.headerFields.push(header);
    poster.primaryFields.push(offer, where);
    poster.backFields.push(...backFields);

    // Shipping a legacy style alongside it means pre-iOS-27 devices still get a usable
    // pass instead of nothing. Wallet prefers posterGeneric wherever it's supported.
    const legacy = new PassType("coupon");
    legacy.headerFields.push(header);
    legacy.primaryFields.push(offer);
    legacy.secondaryFields.push(where);
    legacy.backFields.push(...backFields);

    pk.types.push(poster, legacy);

    // Up to two Featured Actions, rendered as cards under the pass. These are our
    // tracked pass-through URLs, so a front-of-pass tap is counted like any other click.
    const featured: { identifier: string; type: "viewOffersRewards" | "place" | "shop"; url: string }[] = [];
    const has = (a: LinkAction) => links.some((l) => l.action === a);
    if (has("giveaway")) {
      featured.push({ identifier: "giveaway", type: "viewOffersRewards", url: `${base}/r/${pass.serial}/giveaway` });
    }
    if (has("map")) {
      featured.push({ identifier: "map", type: "place", url: `${base}/r/${pass.serial}/map` });
    }
    if (featured.length < 2 && has("website")) {
      featured.push({ identifier: "website", type: "shop", url: `${base}/r/${pass.serial}/website` });
    }
    pk.featuredActions = featured.slice(0, 2);
  } else {
    pk.type = "coupon";
    pk.headerFields.push(header);
    pk.primaryFields.push(offer);
    pk.secondaryFields.push(where);
    pk.backFields.push(...backFields);
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
