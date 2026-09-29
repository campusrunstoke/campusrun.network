import { PKPass } from "passkit-generator";
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
    },
  );

  // "poster" is Apple's iOS 18+ full-bleed event ticket; anything else stays the classic
  // coupon. Both are driven off the same campaign data, so switching is one field.
  const isPoster = campaign.passStyle === "poster";
  if (isPoster) {
    pk.type = "eventTicket";
    pk.preferredStyleSchemes = ["posterEventTicket"];
  } else {
    pk.type = "coupon";
  }

  pk.headerFields.push({ key: "brand", label: "", value: campaign.headerText || campaign.brand });
  pk.primaryFields.push({
    key: "offer",
    label: campaign.offerLabel || "COUPON",
    value: campaign.offerValue || "Your reward",
  });
  pk.secondaryFields.push({
    key: "where",
    label: campaign.secondaryLabel || "WHERE TO BUY",
    value: campaign.secondaryValue || "Tap for the map",
  });
  // Back of the pass: every link is a pass-through URL on our domain (§4), so Wallet
  // makes it tappable and we count the click before bouncing to the real destination.
  for (const l of links) {
    pk.backFields.push({
      key: `link-${l.action}`,
      label: LINK_LABELS[l.action],
      value: `${base}/r/${pass.serial}/${l.action}`,
      attributedValue: `<a href="${base}/r/${pass.serial}/${l.action}">${l.label || LINK_LABELS[l.action]}</a>`,
    });
  }
  if (campaign.terms) {
    pk.backFields.push({ key: "terms", label: "TERMS", value: campaign.terms });
  }
  pk.backFields.push(
    {
      key: "receipt",
      label: "BOUGHT IT?",
      value: `${base}/receipt/${pass.serial}`,
      attributedValue: `<a href="${base}/receipt/${pass.serial}">Tell us where you bought it</a>`,
    },
    { key: "card", label: "CARD", value: pass.cardId },
  );

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
