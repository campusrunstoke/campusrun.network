import { describe, it, expect } from "vitest";
import { geoFromHeaders, newClickId, withTracking } from "@/lib/utm";

const base = { brand: "daps", eventId: "rotm26", cardNumber: "1", clickId: "cr_test12345_" };

describe("withTracking", () => {
  it("appends all tracking params to a bare URL", () => {
    const url = new URL(withTracking("https://example.com", base));
    expect(url.searchParams.get("utm_source")).toBe("campusrun");
    expect(url.searchParams.get("utm_medium")).toBe("nfc");
    expect(url.searchParams.get("utm_campaign")).toBe("daps-rotm26");
    expect(url.searchParams.get("utm_content")).toBe("card-1");
    expect(url.searchParams.get("cr_cid")).toBe("cr_test12345_");
  });

  it("preserves an existing query string", () => {
    const url = new URL(withTracking("https://example.com/landing?foo=bar", base));
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.get("utm_source")).toBe("campusrun");
    expect(url.pathname).toBe("/landing");
  });

  it("keeps admin-baked utm_ params while filling in the missing ones", () => {
    const url = new URL(
      withTracking("https://example.com/?utm_source=baked", base),
    );
    expect(url.searchParams.get("utm_source")).toBe("baked"); // theirs wins
    expect(url.searchParams.get("utm_medium")).toBe("nfc"); // ours fills in
    expect(url.searchParams.get("utm_campaign")).toBe("daps-rotm26");
  });

  it("always overwrites a pre-existing cr_cid", () => {
    const url = new URL(
      withTracking("https://example.com/?cr_cid=stale", base),
    );
    expect(url.searchParams.get("cr_cid")).toBe("cr_test12345_");
  });

  it("omits utm_content when there is no card number", () => {
    const url = new URL(withTracking("https://example.com", { ...base, cardNumber: null }));
    expect(url.searchParams.has("utm_content")).toBe(false);
    expect(url.searchParams.get("utm_campaign")).toBe("daps-rotm26");
  });

  it("preserves paths with trailing slashes", () => {
    const url = new URL(withTracking("https://example.com/landing/", base));
    expect(url.pathname).toBe("/landing/");
  });

  it("puts the query before the fragment", () => {
    const out = withTracking("https://example.com/p#hero", base);
    expect(out).toMatch(/\?.*utm_source=campusrun.*#hero$/);
    expect(new URL(out).hash).toBe("#hero");
  });

  it("returns a malformed destination unchanged", () => {
    expect(withTracking("not a url", base)).toBe("not a url");
  });
});

describe("newClickId", () => {
  it("matches cr_ + 12 base64url chars", () => {
    expect(newClickId()).toMatch(/^cr_[A-Za-z0-9_-]{12}$/);
  });

  it("is unique per call", () => {
    expect(newClickId()).not.toBe(newClickId());
  });
});

describe("geoFromHeaders", () => {
  it("decodes the URI-encoded city header", () => {
    const h = new Headers({
      "x-vercel-ip-city": "S%C3%A3o%20Paulo",
      "x-vercel-ip-country-region": "SP",
      "x-vercel-ip-country": "BR",
    });
    expect(geoFromHeaders(h)).toEqual({ city: "São Paulo", region: "SP", country: "BR" });
  });

  it("is all-null when headers are absent (local dev)", () => {
    expect(geoFromHeaders(new Headers())).toEqual({ city: null, region: null, country: null });
  });

  it("keeps a malformed %-sequence raw instead of throwing", () => {
    const h = new Headers({ "x-vercel-ip-city": "bad%2seq" });
    expect(geoFromHeaders(h).city).toBe("bad%2seq");
  });
});
