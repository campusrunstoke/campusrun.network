import { describe, it, expect } from "vitest";
import { leadsToCsv } from "@/lib/csv";
import { leadSchema } from "@/lib/validation";
import type { Lead } from "@/lib/db/schema";

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: "id-1",
  createdAt: new Date("2026-07-22T12:00:00.000Z"),
  company: "Red Bull",
  contactName: "Alex Rivera",
  email: "alex@redbull.com",
  role: null,
  phone: null,
  website: null,
  interests: [],
  campuses: null,
  timeline: null,
  budget: null,
  message: null,
  heardFrom: null,
  status: "new",
  userAgent: null,
  ...over,
});

describe("leadsToCsv", () => {
  it("writes a header plus one row per lead", () => {
    const csv = leadsToCsv([lead()]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("company,contact");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Red Bull");
  });

  it("flattens interests into a single cell", () => {
    const csv = leadsToCsv([lead({ interests: ["NFC card drops", "Campus activation"] })]);
    expect(csv).toContain("NFC card drops; Campus activation");
  });

  it("quotes messages containing commas and newlines", () => {
    const csv = leadsToCsv([lead({ message: "Line one, with a comma\nand a newline" })]);
    expect(csv).toContain('"Line one, with a comma\nand a newline"');
  });

  it("leaves optional fields empty rather than writing null", () => {
    expect(leadsToCsv([lead()])).not.toContain("null");
  });
});

describe("leadSchema", () => {
  const base = { company: "Red Bull", contactName: "Alex", email: "Alex@RedBull.com " };

  it("accepts the minimum required fields and normalizes the email", () => {
    const parsed = leadSchema.parse(base);
    expect(parsed.email).toBe("alex@redbull.com");
    expect(parsed.interests).toEqual([]);
  });

  it("rejects a missing company", () => {
    expect(leadSchema.safeParse({ ...base, company: "  " }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(leadSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("turns blank optional fields into null", () => {
    const parsed = leadSchema.parse({ ...base, phone: "", message: "   " });
    expect(parsed.phone).toBeNull();
    expect(parsed.message).toBeNull();
  });

  it("drops non-string interests and caps the list", () => {
    const parsed = leadSchema.parse({ ...base, interests: ["a", 5, null, "b"] });
    expect(parsed.interests).toEqual(["a", "b"]);
  });
});
