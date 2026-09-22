import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { DeviceType } from "./types";

/**
 * Serial numbers are random and non-guessable so the public routes that key off them
 * (/r/{serial}, /redeem/{serial}, the Apple pass endpoints) can't be enumerated.
 * 16 bytes = 128 bits of entropy.
 */
export const newSerial = (): string => randomBytes(16).toString("hex"); // 32 chars

/**
 * The per-pass authenticationToken Apple echoes back on every web-service call.
 * Derived as HMAC(secret, serial) rather than stored, so a RE-TAP can rebuild and
 * re-sign the identical pass (a festival double-tap must still hand over the pass),
 * while nobody can forge a token without the server secret. We still persist a hash
 * so validation is a plain compare. Falls back to a random token if no secret is
 * configured (then re-taps serve the web coupon instead).
 */
export function passAuthToken(serial: string): string {
  const secret = process.env.WALLET_TOKEN_SECRET;
  if (!secret) return randomBytes(24).toString("base64url");
  return createHmac("sha256", secret).update(serial).digest("base64url");
}

export const authTokenDerivable = (): boolean => Boolean(process.env.WALLET_TOKEN_SECRET);

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/** Constant-time compare of two short strings (store PINs). Length-safe. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Constant-time compare of a presented token against a stored hash (Apple auth). */
export function tokenMatchesHash(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Coarse device bucket from the User-Agent — enough for the iOS/Android funnel split
 * and to decide .pkpass vs web-coupon fallback. UA sniffing is imperfect by nature;
 * the fallback path is always safe, so a misclassification never loses a tap.
 */
export function detectDevice(userAgent: string | null | undefined): DeviceType {
  const ua = (userAgent ?? "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && /mobile/.test(ua))) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}
