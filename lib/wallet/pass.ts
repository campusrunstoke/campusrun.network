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

  const pk = new PKPass(
    { ...passAssets },
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
      foregroundColor: "rgb(0, 59, 92)",
      backgroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(110, 110, 115)",
    },
  );

  pk.type = "coupon";
  pk.headerFields.push({ key: "brand", label: "", value: campaign.brand });
  pk.primaryFields.push({ key: "offer", label: "COUPON", value: "Your reward" });
  pk.secondaryFields.push({ key: "where", label: "WHERE TO BUY", value: "Tap for the map" });
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
  // camera and lands on /redeem/{serial} (§5 option A) — no app, no typing, and the
  // serial ties the redemption back to the tap.
  pk.setBarcodes({
    message: `${base}/redeem/${pass.serial}`,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: pass.cardId,
  });

  return pk.getAsBuffer();
}
