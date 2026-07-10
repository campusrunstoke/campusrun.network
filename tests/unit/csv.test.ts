import { describe, it, expect } from "vitest";
import { submissionsToCsv } from "@/lib/csv";
import type { Submission } from "@/lib/db/schema";

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
