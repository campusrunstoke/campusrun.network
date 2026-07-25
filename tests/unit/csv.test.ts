import { describe, it, expect } from "vitest";
import { submissionsToCsv, tapsToCsv } from "@/lib/csv";
import type { Submission, Tap } from "@/lib/db/schema";

const row = (over: Partial<Submission>): Submission => ({
  id: "id-1",
  createdAt: new Date("2026-07-09T12:00:00.000Z"),
  rating: 5,
  email: null,
  eventId: null,
  brand: null,
  cardNumber: null,
  userAgent: null,
  campaignId: null,
  ...over,
});

describe("submissionsToCsv", () => {
  it("emits a header row", () => {
    expect(submissionsToCsv([]).trim()).toBe(
      "id,timestamp,rating,email,event (e),brand (b),card (c),user_agent",
    );
  });

  it("renders nulls as empty cells and dates as ISO", () => {
    const csv = submissionsToCsv([row({ rating: 4 })]);
    expect(csv).toContain("id-1,2026-07-09T12:00:00.000Z,4,,,,,");
  });

  it("escapes commas and quotes (CSV injection-safe cells)", () => {
    const csv = submissionsToCsv([row({ userAgent: 'Mozilla, "X"' })]);
    expect(csv).toContain('"Mozilla, ""X"""');
  });
});

const tapRow = (over: Partial<Tap>): Tap => ({
  id: "tap-1",
  createdAt: new Date("2026-07-25T12:00:00.000Z"),
  campaignId: null,
  eventId: null,
  brand: null,
  cardNumber: null,
  clickId: null,
  referrer: null,
  city: null,
  region: null,
  country: null,
  userAgent: null,
  ...over,
});

describe("tapsToCsv", () => {
  it("emits a header row with the tracking columns", () => {
    expect(tapsToCsv([]).trim()).toBe(
      "id,timestamp,event (e),brand (b),card (c),click_id,referrer,city,region,country,user_agent",
    );
  });

  it("renders nulls as empty cells and the click id in place", () => {
    const csv = tapsToCsv([
      tapRow({ eventId: "rotm26", brand: "daps", clickId: "cr_abc123def45", country: "US" }),
    ]);
    expect(csv).toContain("tap-1,2026-07-25T12:00:00.000Z,rotm26,daps,,cr_abc123def45,,,,US,");
  });
});
