import { describe, it, expect } from "vitest";
import { campaignUrl } from "@/lib/campaigns";

describe("campaignUrl", () => {
  it("builds a link from brand + event", () => {
    expect(
      campaignUrl({ brand: "daps", eventId: "rotm25", cardNumber: null }, "https://campusrun.network"),
    ).toBe("https://campusrun.network/stoked?e=rotm25&b=daps");
  });

  it("includes the card number when present", () => {
    expect(
      campaignUrl({ brand: "lg", eventId: "ucla-w1", cardNumber: "42" }, "https://x.test"),
    ).toBe("https://x.test/stoked?e=ucla-w1&b=lg&c=42");
  });

  it("normalizes a trailing slash on the base", () => {
    expect(
      campaignUrl({ brand: "b", eventId: "e", cardNumber: null }, "https://x.test/"),
    ).toBe("https://x.test/stoked?e=e&b=b");
  });
});
