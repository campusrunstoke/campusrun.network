/**
 * Apple Wallet signing configuration, driven entirely by environment variables so
 * the real cert/IDs from KC swap in without a code change. Certs are stored base64
 * (PEM → base64) so they survive a single-line env var on Vercel.
 *
 * Until KC delivers the Apple Developer cert, `walletConfigured` is false and the
 * whole app still runs: taps are logged, the dashboard works, and the tap landing
 * serves the tracked web-coupon fallback instead of a .pkpass. Nothing is blocked.
 */

const b64 = (v: string | undefined): Buffer | null =>
  v && v.trim() !== "" ? Buffer.from(v.trim(), "base64") : null;

const str = (v: string | undefined): string | null => (v && v.trim() !== "" ? v.trim() : null);

export const walletConfig = {
  passTypeIdentifier: str(process.env.WALLET_PASS_TYPE_ID),
  teamIdentifier: str(process.env.WALLET_TEAM_ID),
  organizationName: process.env.WALLET_ORG_NAME?.trim() || "Campus Run",

  signerCert: b64(process.env.WALLET_SIGNER_CERT_B64),
  signerKey: b64(process.env.WALLET_SIGNER_KEY_B64),
  wwdr: b64(process.env.WALLET_WWDR_B64),
  signerKeyPassphrase: process.env.WALLET_SIGNER_KEY_PASSPHRASE || undefined,
};

/** True only when every piece needed to sign a real, installable pass is present. */
export const walletConfigured: boolean = Boolean(
  walletConfig.passTypeIdentifier &&
    walletConfig.teamIdentifier &&
    walletConfig.signerCert &&
    walletConfig.signerKey &&
    walletConfig.wwdr,
);

export class WalletNotConfiguredError extends Error {
  constructor() {
    super("Apple Wallet signing is not configured (missing cert / Pass Type ID / Team ID)");
    this.name = "WalletNotConfiguredError";
  }
}
