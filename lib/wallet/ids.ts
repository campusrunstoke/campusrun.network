import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import type { DeviceType } from "./types";

/**
 * Serial numbers and auth tokens are random and non-guessable so the public routes
 * that key off them (/r/{serial}, /redeem/{serial}, the Apple pass endpoints) can't
 * be enumerated. 16 bytes = 128 bits of entropy.
 */
export const newSerial = (): string => randomBytes(16).toString("hex"); // 32 chars
export const newAuthToken = (): string => randomBytes(24).toString("base64url"); // >16 chars

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

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
