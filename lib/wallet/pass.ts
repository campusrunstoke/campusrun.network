import { PKPass } from "passkit-generator";
import { walletConfig, walletConfigured, WalletNotConfiguredError } from "./config";
import { passAssets } from "./assets";
import { siteUrl } from "@/lib/campaigns";
import type { Pass, WalletCampaign } from "@/lib/db/schema";

/**
 * Builds a signed .pkpass buffer for one card's pass. Per-pass values (serial,
 * authenticationToken, webServiceURL) are injected here so a tap and a later
 * redemption resolve back to the same card (§4).
 *
 * This is a placeholder coupon template — real design/art/copy swap in from KC's
 * pass.json + assets without touching the tap→serve→register plumbing around it.
 */
export async function buildPass(
  pass: Pick<Pass, "serial" | "cardId">,
  campaign: WalletCampaign,
  authToken: string,
): Promise<Buffer> {
  if (!walletConfigured) throw new WalletNotConfiguredError();

  const passTypeIdentifier = campaign.passTypeIdentifier || walletConfig.passTypeIdentifier!;

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
      webServiceURL: `${siteUrl()}/api/wallet`,
      foregroundColor: "rgb(0, 59, 92)",
      backgroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(110, 110, 115)",
    },
  );

  pk.type = "coupon";
  pk.headerFields.push({ key: "brand", label: "", value: campaign.brand });
  pk.primaryFields.push({ key: "offer", label: "COUPON", value: "Your reward" });
  pk.secondaryFields.push({ key: "where", label: "WHERE TO BUY", value: "Tap for the map" });
  pk.backFields.push(
    { key: "about", label: "Campus Run", value: "Tap the links on this pass for the map, site, and more." },
    { key: "card", label: "Card", value: pass.cardId },
  );

  // The barcode encodes the serial so a cashier scan at redemption resolves to this exact card.
  pk.setBarcodes({
    message: pass.serial,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: pass.cardId,
  });

  return pk.getAsBuffer();
}
