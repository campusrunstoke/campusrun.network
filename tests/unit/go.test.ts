import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Route-level test for /go with the DB mocked out: campaign lookup + tap
// insert are stubbed so we can assert on the redirect and the logged row.
const inserted: unknown[] = [];
let campaignRow: Record<string, unknown> | undefined;
let insertShouldThrow = false;

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => (campaignRow ? [campaignRow] : []) }),
      }),
    }),
    insert: () => ({
      values: async (v: unknown) => {
        if (insertShouldThrow) throw new Error("db down");
        inserted.push(v);
      },
    }),
  },
}));

import { GET } from "@/app/go/route";

const daps = {
  id: "camp-1",
  type: "redirect",
  destinationUrl: "https://example.com/landing?utm_source=baked",
  brand: "daps",
  eventId: "rotm26",
};

function tap(url: string, headers?: Record<string, string>) {
  return GET(new NextRequest(url, { headers }));
}

beforeEach(() => {
  inserted.length = 0;
  campaignRow = daps;
  insertShouldThrow = false;
});

describe("GET /go", () => {
  it("307-redirects a matched campaign with tracking params appended", async () => {
    const res = await tap("https://campusrun.network/go?e=rotm26&b=daps&c=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe("https://example.com/landing");
    expect(loc.searchParams.get("utm_source")).toBe("baked"); // admin-baked wins
    expect(loc.searchParams.get("utm_medium")).toBe("nfc");
    expect(loc.searchParams.get("utm_campaign")).toBe("daps-rotm26");
    expect(loc.searchParams.get("utm_content")).toBe("card-1");
    expect(loc.searchParams.get("cr_cid")).toMatch(/^cr_[A-Za-z0-9_-]{12}$/);
  });

  it("logs the tap with click id, geo, and referrer", async () => {
    await tap("https://campusrun.network/go?e=rotm26&b=daps&c=1", {
      referer: "https://instagram.com/",
      "user-agent": "test-agent",
      "x-vercel-ip-city": "S%C3%A3o%20Paulo",
      "x-vercel-ip-country-region": "SP",
      "x-vercel-ip-country": "BR",
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      campaignId: "camp-1",
      eventId: "rotm26",
      brand: "daps",
      cardNumber: "1",
      referrer: "https://instagram.com/",
      city: "São Paulo",
      region: "SP",
      country: "BR",
      userAgent: "test-agent",
    });
    const row = inserted[0] as { clickId: string };
    expect(row.clickId).toMatch(/^cr_[A-Za-z0-9_-]{12}$/);
  });

  it("cr_cid in the redirect matches the logged click id", async () => {
    const res = await tap("https://campusrun.network/go?e=rotm26&b=daps");
    const loc = new URL(res.headers.get("location")!);
    const row = inserted[0] as { clickId: string };
    expect(loc.searchParams.get("cr_cid")).toBe(row.clickId);
  });

  it("falls back to a clean homepage URL when nothing matches — but still logs", async () => {
    campaignRow = undefined;
    const res = await tap("https://campusrun.network/go?e=nope&b=nope");
    const loc = new URL(res.headers.get("location")!);
    expect(loc.search).toBe(""); // no utm_*, no cr_cid on our own homepage
    expect(inserted).toHaveLength(1);
    expect((inserted[0] as { clickId: string }).clickId).toMatch(/^cr_/);
  });

  it("still redirects with cr_cid when the tap insert fails", async () => {
    insertShouldThrow = true;
    const res = await tap("https://campusrun.network/go?e=rotm26&b=daps&c=1");
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.searchParams.get("cr_cid")).toMatch(/^cr_/);
    expect(inserted).toHaveLength(0);
  });

  it("does not decorate a rating-type campaign (no destination)", async () => {
    campaignRow = { ...daps, type: "rating", destinationUrl: null };
    const res = await tap("https://campusrun.network/go?e=rotm26&b=daps");
    const loc = new URL(res.headers.get("location")!);
    expect(loc.search).toBe("");
  });
});
