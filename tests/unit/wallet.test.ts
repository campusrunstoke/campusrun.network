import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectDevice, passAuthToken, hashToken, tokenMatchesHash, newSerial } from "@/lib/wallet/ids";
import { conversions } from "@/lib/wallet/stats";
import { mintCardIds, cardUrl } from "@/lib/wallet/cards";

describe("detectDevice", () => {
  it("classifies iPhone / iPad as ios", () => {
    expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("ios");
  });
  it("classifies Android", () => {
    expect(detectDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
  });
  it("falls back to other for desktops and missing UA", () => {
    expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("other");
    expect(detectDevice(null)).toBe("other");
  });
});

describe("pass auth token", () => {
  const original = process.env.WALLET_TOKEN_SECRET;
  beforeEach(() => {
    process.env.WALLET_TOKEN_SECRET = "test-secret";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.WALLET_TOKEN_SECRET;
    else process.env.WALLET_TOKEN_SECRET = original;
  });

  it("is deterministic per serial so a re-tap re-issues the same pass", () => {
    const serial = newSerial();
    expect(passAuthToken(serial)).toBe(passAuthToken(serial));
    expect(passAuthToken(serial)).not.toBe(passAuthToken(newSerial()));
  });

  it("meets Apple's 16-char minimum", () => {
    expect(passAuthToken("abc").length).toBeGreaterThanOrEqual(16);
  });

  it("validates against the stored hash with a constant-time compare", () => {
    const token = passAuthToken("s1");
    const stored = hashToken(token);
    expect(tokenMatchesHash(token, stored)).toBe(true);
    expect(tokenMatchesHash(token + "x", stored)).toBe(false);
    expect(tokenMatchesHash("", stored)).toBe(false);
  });

  it("is random (non-derivable) when no secret is configured", () => {
    delete process.env.WALLET_TOKEN_SECRET;
    expect(passAuthToken("s1")).not.toBe(passAuthToken("s1"));
  });
});

describe("serials", () => {
  it("are 32 hex chars and unique", () => {
    const a = newSerial();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(newSerial());
  });
});

describe("conversions", () => {
  it("uses people reached as the denominator so rates never exceed 100%", () => {
    // 3 people, 1 pass, 2 redemptions (one via web coupon, no pass) — the trap case.
    const c = conversions({ taps: 6, people: 3, passesAdded: 1, clicks: 1, clickers: 1, redemptions: 2 });
    expect(c.tapToPass).toBe(33.3);
    expect(c.tapToClick).toBe(33.3);
    expect(c.tapToRedemption).toBe(66.7);
  });
  it("is zero-safe with no traffic", () => {
    const c = conversions({ taps: 0, people: 0, passesAdded: 0, clicks: 0, clickers: 0, redemptions: 0 });
    expect(c).toEqual({ tapToPass: 0, tapToClick: 0, tapToRedemption: 0 });
  });
});

describe("mintCardIds", () => {
  it("numbers sequentially from an offset with a random suffix", () => {
    const ids = mintCardIds("pocari", 3, 10);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toMatch(/^pocari-0011-[a-z0-9]{4}$/);
    expect(ids[2]).toMatch(/^pocari-0013-[a-z0-9]{4}$/);
    expect(new Set(ids).size).toBe(3);
  });
  it("builds the landing URL on the site base", () => {
    expect(cardUrl("pocari-0001-ab12", "https://campusrun.network/")).toBe(
      "https://campusrun.network/c/pocari-0001-ab12",
    );
  });
});
